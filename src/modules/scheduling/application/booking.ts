import { DomainError } from '../../../shared/domain/domain-error.js';
import { localDate, toLocal, toUtc } from '../../../shared/domain/zoned-time.js';
import type { Barbershop } from '../../shops/domain/barbershop.js';
import { Appointment } from '../domain/appointment.js';
import { BOOKING_HORIZON_DAYS, availableStarts } from '../domain/availability.js';
import { bookableBarber, bookableService } from './lookups.js';
import type { SchedulingDeps, SchedulingRepositories } from './ports.js';

type Reads = Pick<SchedulingDeps, 'clock'> & SchedulingRepositories;

/**
 * Free start times of one barber profile on one local date, for a service of a given length.
 * Busy time counts across all of the person's shops: they cannot be in two places at once.
 */
async function startsOn(
  deps: Reads,
  input: {
    barberId: string;
    barberUserId: string;
    shop: Barbershop;
    date: string;
    durationMinutes: number;
    excludeId?: string;
  },
): Promise<Date[]> {
  const date = localDate(input.date);
  const tz = input.shop.timezone;
  const { schedule, blockedDates } = await deps.schedules.get(input.barberId);
  const busy = await deps.appointments.busyFor(
    input.barberUserId,
    toUtc(date, 0, tz),
    toUtc(date, 1440, tz),
    input.excludeId,
  );
  return availableStarts({
    schedule,
    blockedDates,
    date,
    timezone: tz,
    durationMinutes: input.durationMinutes,
    busy,
    now: deps.clock.now(),
  });
}

/** Rejects a start time the customer could not have picked from availableSlots. */
async function assertStartAvailable(
  deps: Reads,
  input: {
    barberId: string;
    barberUserId: string;
    shop: Barbershop;
    startsAt: Date;
    durationMinutes: number;
    excludeId?: string;
  },
) {
  const now = deps.clock.now();
  if (input.startsAt <= now) throw new DomainError('SLOT_IN_PAST', 'This time has already passed.');
  if (input.startsAt.getTime() > now.getTime() + BOOKING_HORIZON_DAYS * 86_400_000) {
    throw new DomainError(
      'BEYOND_BOOKING_HORIZON',
      `Appointments can be booked up to ${BOOKING_HORIZON_DAYS} days ahead.`,
    );
  }
  const { date } = toLocal(input.startsAt, input.shop.timezone);
  const starts = await startsOn(deps, { ...input, date });
  if (!starts.some((s) => s.getTime() === input.startsAt.getTime())) {
    throw new DomainError('SLOT_UNAVAILABLE', 'This time is no longer available.');
  }
}

export async function availableSlots(
  deps: SchedulingDeps,
  input: { barberId: string; serviceId: string; date: string },
): Promise<Date[]> {
  const { barber, shop } = await bookableBarber(deps, input.barberId);
  const service = await bookableService(deps, input.barberId, input.serviceId);
  return startsOn(deps, {
    barberId: input.barberId,
    barberUserId: barber.userId,
    shop,
    date: input.date,
    durationMinutes: service.durationMinutes,
  });
}

/**
 * Free start times for moving an appointment: its own (snapshot) duration, and its current
 * slot counts as free, so it can shift by 15 minutes. Only its customer and barber may ask.
 */
export async function rescheduleSlots(
  deps: SchedulingDeps,
  actorId: string,
  input: { appointmentId: string; date: string },
): Promise<Date[]> {
  const appointment = await deps.appointments.findById(input.appointmentId);
  const barber = appointment ? await deps.directory.barber(appointment.barberId) : null;
  if (!appointment || (appointment.customerId !== actorId && barber?.userId !== actorId)) {
    throw new DomainError('APPOINTMENT_NOT_FOUND', 'Appointment not found.');
  }
  appointment.assertChangeable(deps.clock.now());
  const { shop } = await bookableBarber(deps, appointment.barberId);
  return startsOn(deps, {
    barberId: appointment.barberId,
    barberUserId: appointment.barberUserId,
    shop,
    date: input.date,
    durationMinutes: appointment.durationMinutes,
    excludeId: appointment.id,
  });
}

/**
 * Checks and inserts in one transaction holding the barber's row shared, so a blocked day,
 * new hours or a removal committed meanwhile is seen here, never slipped past.
 */
export async function bookAppointment(
  deps: SchedulingDeps,
  customerId: string,
  input: {
    barberId: string;
    serviceId: string;
    startsAt: Date;
    reminderLeadMinutes: number | null;
  },
): Promise<Appointment> {
  const appointment = await deps.transaction(async (tx) => {
    await tx.schedules.lockBarber(input.barberId, 'share');
    const { barber, shop } = await bookableBarber(deps, input.barberId);
    if (barber.userId === customerId) {
      throw new DomainError(
        'BARBER_CANNOT_BOOK_SELF',
        'You cannot book an appointment with yourself.',
      );
    }
    const service = await bookableService(deps, barber.id, input.serviceId);
    await assertStartAvailable(
      { ...tx, clock: deps.clock },
      {
        barberId: barber.id,
        barberUserId: barber.userId,
        shop,
        startsAt: input.startsAt,
        durationMinutes: service.durationMinutes,
      },
    );
    const booked = Appointment.book(
      {
        barberId: barber.id,
        barberUserId: barber.userId,
        customerId,
        service: {
          id: service.id,
          name: service.name,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
        },
        startsAt: input.startsAt,
        reminderLeadMinutes: input.reminderLeadMinutes,
      },
      deps.clock.now(),
    );
    // two bookings for one slot can both pass the check; the exclusion constraints
    // refuse the second with SLOT_UNAVAILABLE or CUSTOMER_BUSY
    await tx.appointments.insert(booked);
    return booked;
  });
  await deps.events.publish([{ type: 'booked', appointment, byUserId: customerId }]);
  return appointment;
}

/**
 * Runs `change` on the appointment inside a transaction: barber row shared, then the
 * appointment row exclusive (always in that order, so agenda changes cannot deadlock with
 * it). Two writers on one appointment take turns, and the second sees the first's result.
 */
async function changeAppointment<T>(
  deps: SchedulingDeps,
  actorId: string,
  id: string,
  change: (
    tx: SchedulingRepositories,
    appointment: Appointment,
    role: 'customer' | 'barber',
  ) => Promise<T>,
): Promise<T> {
  const notFound = () => new DomainError('APPOINTMENT_NOT_FOUND', 'Appointment not found.');
  return deps.transaction(async (tx) => {
    const peek = await tx.appointments.findById(id);
    if (!peek) throw notFound();
    await tx.schedules.lockBarber(peek.barberId, 'share');
    const appointment = (await tx.appointments.findById(id, { forUpdate: true }))!;
    if (appointment.customerId === actorId) return change(tx, appointment, 'customer');
    const barber = await deps.directory.barber(appointment.barberId);
    if (barber?.userId === actorId) return change(tx, appointment, 'barber');
    throw notFound();
  });
}

export async function cancelAppointment(deps: SchedulingDeps, actorId: string, id: string) {
  const appointment = await changeAppointment(deps, actorId, id, async (tx, a, role) => {
    a.cancel({ userId: actorId, reason: role }, deps.clock.now());
    await tx.appointments.update(a);
    return a;
  });
  await deps.events.publish([{ type: 'canceled', appointment, byUserId: actorId }]);
  return appointment;
}

/** Same barber and service; only the time moves, in place, so a failure keeps the old time. */
export async function rescheduleAppointment(
  deps: SchedulingDeps,
  actorId: string,
  id: string,
  newStartsAt: Date,
) {
  let previousStartsAt!: Date;
  const appointment = await changeAppointment(deps, actorId, id, async (tx, a) => {
    const now = deps.clock.now();
    a.assertChangeable(now);
    const { shop } = await bookableBarber(deps, a.barberId);
    await assertStartAvailable(
      { ...tx, clock: deps.clock },
      {
        barberId: a.barberId,
        barberUserId: a.barberUserId,
        shop,
        startsAt: newStartsAt,
        durationMinutes: a.durationMinutes,
        excludeId: a.id,
      },
    );
    previousStartsAt = a.startsAt;
    a.reschedule(newStartsAt, now);
    await tx.appointments.update(a);
    return a;
  });
  await deps.events.publish([
    { type: 'rescheduled', appointment, byUserId: actorId, previousStartsAt },
  ]);
  return appointment;
}
