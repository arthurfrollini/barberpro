import { DomainError } from '../../../shared/domain/domain-error.js';
import { Service } from '../domain/service.js';
import { requireOwnBarber } from './guards.js';
import type { ShopsDeps } from './ports.js';

type ServiceInput = {
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
};

export async function createService(
  deps: ShopsDeps,
  actorId: string,
  barberId: string,
  input: ServiceInput,
) {
  const barber = await requireOwnBarber(deps, actorId, barberId);
  const service = Service.create({ ...input, barberId: barber.id }, deps.clock.now());
  await deps.services.save(service);
  return service;
}

/** The service, if the actor is the active barber who offers it. */
async function ownService(deps: ShopsDeps, actorId: string, serviceId: string) {
  const service = await deps.services.findById(serviceId);
  if (!service) throw new DomainError('SERVICE_NOT_FOUND', 'Service not found.');
  const barber = await deps.barbers.findById(service.barberId);
  if (!barber || barber.userId !== actorId || !barber.isActive) {
    throw new DomainError(
      'NOT_SERVICE_OWNER',
      'Only the barber who offers this service can change it.',
    );
  }
  return service;
}

export async function updateService(
  deps: ShopsDeps,
  actorId: string,
  serviceId: string,
  patch: Partial<ServiceInput>,
) {
  const service = await ownService(deps, actorId, serviceId);
  service.update(patch, deps.clock.now());
  await deps.services.save(service);
  return service;
}

export async function archiveService(deps: ShopsDeps, actorId: string, serviceId: string) {
  const service = await ownService(deps, actorId, serviceId);
  service.archive(deps.clock.now());
  await deps.services.save(service);
  return service;
}
