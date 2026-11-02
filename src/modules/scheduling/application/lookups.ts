import { DomainError } from '../../../shared/domain/domain-error.js';
import type { SchedulingDeps } from './ports.js';

/** An active barber and their shop (whose timezone the schedule is written in). */
export async function bookableBarber(deps: Pick<SchedulingDeps, 'directory'>, barberId: string) {
  const barber = await deps.directory.barber(barberId);
  const shop = barber?.isActive ? await deps.directory.shop(barber.shopId) : null;
  if (!barber || !shop) throw new DomainError('BARBER_NOT_FOUND', 'Barber not found.');
  return { barber, shop };
}

/**
 * One of the signed-in user's own active barber profiles, with its shop: a person who works
 * in two shops has two profiles, and every agenda or hours operation names which one.
 */
export async function ownBarber(
  deps: Pick<SchedulingDeps, 'directory'>,
  userId: string,
  barberId: string,
) {
  const barber = await deps.directory.barber(barberId);
  const shop =
    barber?.isActive && barber.userId === userId ? await deps.directory.shop(barber.shopId) : null;
  if (!barber || !shop) throw new DomainError('NOT_A_BARBER', 'You are not this barber.');
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
