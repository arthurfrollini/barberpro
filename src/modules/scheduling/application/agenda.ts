import { localDate, toUtc } from '../../../shared/domain/zoned-time.js';
import { ownBarber } from './lookups.js';
import type { SchedulingDeps } from './ports.js';

/** Upcoming: from now on, soonest first. Otherwise: the latest 100, newest first. */
export async function myAppointments(
  deps: SchedulingDeps,
  customerId: string,
  options: { upcoming: boolean },
) {
  return deps.appointments.forCustomer(customerId, options.upcoming ? deps.clock.now() : undefined);
}

/** Everything on the barber's local date, canceled ones included, in time order. */
export async function barberAgenda(
  deps: SchedulingDeps,
  actorId: string,
  barberId: string,
  rawDate: string,
) {
  const { barber, shop } = await ownBarber(deps, actorId, barberId);
  const date = localDate(rawDate);
  return deps.appointments.forBarberBetween(
    barber.id,
    toUtc(date, 0, shop.timezone),
    toUtc(date, 1440, shop.timezone),
  );
}
