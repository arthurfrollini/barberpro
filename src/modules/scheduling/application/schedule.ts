import { DomainError } from '../../../shared/domain/domain-error.js';
import { localDate, toLocal, toUtc } from '../../../shared/domain/zoned-time.js';
import { type Appointment, CHANGE_WINDOW_MINUTES } from '../domain/appointment.js';
import { type WeeklyInterval, WeeklySchedule } from '../domain/weekly-schedule.js';
import { ownBarber } from './lookups.js';
import type { SchedulingDeps, SchedulingRepositories } from './ports.js';

/** Appointments starting this late or later may still be canceled by agenda changes. */
const cutoff = (now: Date) => new Date(now.getTime() + CHANGE_WINDOW_MINUTES * 60_000);

/** True when the appointment still sits inside one interval of its local weekday. */
function fits(appointment: Appointment, schedule: WeeklySchedule, timezone: string): boolean {
  const start = toLocal(appointment.startsAt, timezone);
  const end = toLocal(appointment.endsAt, timezone);
  const endMinute = end.date === start.date ? end.minuteOfDay : 1440 + end.minuteOfDay;
  return schedule.fits(start.weekday, start.minuteOfDay, endMinute);
}

/** Events go out after the transaction commits, never for work that was rolled back. */
export async function publishCanceled(
  deps: Pick<SchedulingDeps, 'events'>,
  canceled: Appointment[],
  byUserId: string,
) {
  await deps.events.publish(
    canceled.map((appointment) => ({ type: 'canceled' as const, appointment, byUserId })),
  );
}

/**
 * Replaces the barber's weekly hours. Booked appointments 2 hours or more away that no
 * longer fit are canceled in the same transaction; nearer ones stay (the barber attends).
 */
export async function setWeeklySchedule(
  deps: SchedulingDeps,
  actorId: string,
  barberId: string,
  intervals: WeeklyInterval[],
) {
  const { barber, shop } = await ownBarber(deps, actorId, barberId);
  const schedule = WeeklySchedule.of(intervals);
  const now = deps.clock.now();
  const canceled = await deps.transaction(async (tx) => {
    // exclusive: in-flight bookings finish first, new ones wait and then see the new hours
    await tx.schedules.lockBarber(barber.id, 'update');
    await tx.schedules.replaceWeekly(barber.id, schedule);
    const outside = (await tx.appointments.bookedFrom(barber.id, cutoff(now))).filter(
      (a) => !fits(a, schedule, shop.timezone),
    );
    for (const a of outside) {
      a.cancelBySystem('schedule_changed', actorId, now);
      await tx.appointments.update(a);
    }
    return outside;
  });
  await publishCanceled(deps, canceled, actorId);
  return { schedule, canceled };
}

/** Blocks a whole local date; same two-hour rule for the appointments already on it. */
export async function blockDate(
  deps: SchedulingDeps,
  actorId: string,
  barberId: string,
  rawDate: string,
) {
  const { barber, shop } = await ownBarber(deps, actorId, barberId);
  const date = localDate(rawDate);
  const now = deps.clock.now();
  if (date < toLocal(now, shop.timezone).date) {
    throw new DomainError('INVALID_DATE', 'This date has already passed.');
  }
  const canceled = await deps.transaction(async (tx) => {
    await tx.schedules.lockBarber(barber.id, 'update');
    await tx.schedules.block(barber.id, date);
    const day = await tx.appointments.forBarberBetween(
      barber.id,
      toUtc(date, 0, shop.timezone),
      toUtc(date, 1440, shop.timezone),
    );
    const toCancel = day.filter((a) => a.status === 'booked' && a.startsAt >= cutoff(now));
    for (const a of toCancel) {
      a.cancelBySystem('day_blocked', actorId, now);
      await tx.appointments.update(a);
    }
    return toCancel;
  });
  await publishCanceled(deps, canceled, actorId);
  return canceled;
}

export async function unblockDate(
  deps: SchedulingDeps,
  actorId: string,
  barberId: string,
  rawDate: string,
) {
  const { barber } = await ownBarber(deps, actorId, barberId);
  await deps.schedules.unblock(barber.id, localDate(rawDate));
}

export async function mySchedule(deps: SchedulingDeps, actorId: string, barberId: string) {
  const { barber } = await ownBarber(deps, actorId, barberId);
  return deps.schedules.get(barber.id);
}

/**
 * Rule 7, inside a transaction the caller owns: the barber's row is locked and booked
 * appointments 2 hours or more away are canceled. The caller saves the removal in the same
 * transaction, then publishes the returned appointments.
 */
export async function cancelFutureWithin(
  tx: SchedulingRepositories,
  barberId: string,
  byUserId: string,
  now: Date,
): Promise<Appointment[]> {
  await tx.schedules.lockBarber(barberId, 'update');
  const future = await tx.appointments.bookedFrom(barberId, cutoff(now));
  for (const a of future) {
    a.cancelBySystem('barber_removed', byUserId, now);
    await tx.appointments.update(a);
  }
  return future;
}

export async function cancelFutureForBarber(
  deps: SchedulingDeps,
  barberId: string,
  byUserId: string,
): Promise<Appointment[]> {
  const canceled = await deps.transaction((tx) =>
    cancelFutureWithin(tx, barberId, byUserId, deps.clock.now()),
  );
  await publishCanceled(deps, canceled, byUserId);
  return canceled;
}
