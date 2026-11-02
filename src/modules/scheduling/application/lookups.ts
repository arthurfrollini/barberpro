import { DomainError } from '../../../shared/domain/domain-error.js';
import type { SchedulingDeps } from './ports.js';

/** An active barber and their shop (whose timezone the schedule is written in). */
export async function bookableBarber(deps: Pick<SchedulingDeps, 'directory'>, barberId: string) {
  const barber = await deps.directory.barber(barberId);
  const shop = barber?.isActive ? await deps.directory.shop(barber.shopId) : null;
  if (!barber || !shop) throw new DomainError('BARBER_NOT_FOUND', 'Barber not found.');
  return { barber, shop };
}

/** The signed-in user's barber profile and shop; for the barber's own agenda and hours. */
export async function barberOfUser(deps: Pick<SchedulingDeps, 'directory'>, userId: string) {
  const barber = await deps.directory.barberOfUser(userId);
  const shop = barber ? await deps.directory.shop(barber.shopId) : null;
  if (!barber || !shop) throw new DomainError('NOT_A_BARBER', 'You are not a barber in any shop.');
  return { barber, shop };
}

export async function bookableService(
  deps: Pick<SchedulingDeps, 'directory'>,
  barberId: string,
  serviceId: string,
) {
  const service = await deps.directory.service(serviceId);
  if (!service || service.barberId !== barberId || service.isArchived) {
    throw new DomainError('SERVICE_NOT_FOUND', 'This barber does not offer this service.');
  }
  return service;
}
