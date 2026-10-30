import { DomainError } from '../../../shared/domain/domain-error.js';
import { localDate, toLocal, toUtc } from '../../../shared/domain/zoned-time.js';
import type { Barbershop } from '../../shops/domain/barbershop.js';
import { Appointment } from '../domain/appointment.js';
import { BOOKING_HORIZON_DAYS, availableStarts } from '../domain/availability.js';
import { bookableBarber, bookableService } from './lookups.js';
import type { SchedulingDeps } from './ports.js';

/** Free start times of one barber on one local date, for a service of a given length. */
async function startsOn(
  deps: SchedulingDeps,
  input: {
    barberId: string;
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
    input.barberId,
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
  deps: SchedulingDeps,
  input: {
    barberId: string;
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
  const { shop } = await bookableBarber(deps, input.barberId);
  const service = await bookableService(deps, input.barberId, input.serviceId);
  return startsOn(deps, {
    barberId: input.barberId,
    shop,
    date: input.date,
    durationMinutes: service.durationMinutes,
  });
}

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
  const { barber, shop } = await bookableBarber(deps, input.barberId);
  if (barber.userId === customerId) {
    throw new DomainError(
      'BARBER_CANNOT_BOOK_SELF',
      'You cannot book an appointment with yourself.',
    );
  }
  const service = await bookableService(deps, barber.id, input.serviceId);
  await assertStartAvailable(deps, {
    barberId: barber.id,
    shop,
    startsAt: input.startsAt,
    durationMinutes: service.durationMinutes,
  });
  const appointment = Appointment.book(
    {
      barberId: barber.id,
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
  // a concurrent booking can still win between the check and here; the exclusion
  // constraints refuse ours with SLOT_UNAVAILABLE or CUSTOMER_BUSY
  await deps.appointments.insert(appointment);
  await deps.events.publish([{ type: 'booked', appointment }]);
  return appointment;
}

/** The appointment and the role the actor plays in it (customer or barber). */
async function ownAppointment(deps: SchedulingDeps, actorId: string, id: string) {
  const appointment = await deps.appointments.findById(id);
  if (appointment) {
    if (appointment.customerId === actorId) return { appointment, role: 'customer' as const };
    const barber = await deps.directory.barber(appointment.barberId);
    if (barber?.userId === actorId) return { appointment, role: 'barber' as const };
  }
  throw new DomainError('APPOINTMENT_NOT_FOUND', 'Appointment not found.');
}

export async function cancelAppointment(deps: SchedulingDeps, actorId: string, id: string) {
  const { appointment, role } = await ownAppointment(deps, actorId, id);
  appointment.cancel({ userId: actorId, reason: role }, deps.clock.now());
  await deps.appointments.update(appointment);
  await deps.events.publish([{ type: 'canceled', appointment }]);
  return appointment;
}

/** Same barber and service; only the time moves, in place, so a failure keeps the old time. */
export async function rescheduleAppointment(
  deps: SchedulingDeps,
  actorId: string,
  id: string,
  newStartsAt: Date,
) {
  const { appointment } = await ownAppointment(deps, actorId, id);
  const now = deps.clock.now();
  appointment.assertChangeable(now);
  const { shop } = await bookableBarber(deps, appointment.barberId);
  await assertStartAvailable(deps, {
    barberId: appointment.barberId,
    shop,
    startsAt: newStartsAt,
    durationMinutes: appointment.durationMinutes,
    excludeId: appointment.id,
  });
  const previousStartsAt = appointment.startsAt;
  appointment.reschedule(newStartsAt, now);
  await deps.appointments.update(appointment);
  await deps.events.publish([{ type: 'rescheduled', appointment, previousStartsAt }]);
  return appointment;
}
