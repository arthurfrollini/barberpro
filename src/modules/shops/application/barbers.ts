import { DomainError } from '../../../shared/domain/domain-error.js';
import { Barber } from '../domain/barber.js';
import {
  assertNotBarbering,
  assertOwnFile,
  requireActiveBarber,
  requireOwnedShop,
} from './guards.js';
import type { ShopsDeps } from './ports.js';

/** The owner also cuts hair in their own shop. */
export async function becomeBarber(deps: ShopsDeps, actorId: string): Promise<Barber> {
  const shop = await requireOwnedShop(deps, actorId);
  await assertNotBarbering(deps, actorId);
  const barber = Barber.create({ shopId: shop.id, userId: actorId }, deps.clock.now());
  await deps.barbers.save(barber);
  return barber;
}

export async function removeBarber(
  deps: ShopsDeps,
  actorId: string,
  barberId: string,
): Promise<Barber> {
  const shop = await requireOwnedShop(deps, actorId);
  const barber = await deps.barbers.findById(barberId);
  if (!barber || barber.shopId !== shop.id || !barber.isActive) {
    throw new DomainError('BARBER_NOT_FOUND', 'This barber is not in your shop.');
  }
  barber.remove(deps.clock.now());
  await deps.persistRemoval(barber, actorId);
  return barber;
}

export async function updateBarberProfile(
  deps: ShopsDeps,
  actorId: string,
  patch: { bio?: string; avatarFileId?: string | null },
): Promise<Barber> {
  const barber = await requireActiveBarber(deps, actorId);
  await assertOwnFile(deps, actorId, patch.avatarFileId);
  barber.updateProfile(patch);
  await deps.barbers.save(barber);
  return barber;
}
