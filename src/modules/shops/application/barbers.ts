import { DomainError } from '../../../shared/domain/domain-error.js';
import { Barber } from '../domain/barber.js';
import {
  assertNotBarberingIn,
  assertOwnFile,
  requireOwnBarber,
  requireOwnedShop,
} from './guards.js';
import type { ShopsDeps } from './ports.js';

/** The owner also cuts hair in one of their shops. */
export async function becomeBarber(
  deps: ShopsDeps,
  actorId: string,
  shopId: string,
): Promise<Barber> {
  const shop = await requireOwnedShop(deps, actorId, shopId);
  await assertNotBarberingIn(deps, actorId, shop.id);
  const barber = Barber.create({ shopId: shop.id, userId: actorId }, deps.clock.now());
  await deps.barbers.save(barber);
  return barber;
}

export async function removeBarber(
  deps: ShopsDeps,
  actorId: string,
  barberId: string,
): Promise<Barber> {
  const barber = await deps.barbers.findById(barberId);
  const shop = barber ? await deps.shops.findById(barber.shopId) : null;
  if (!barber || !barber.isActive || shop?.ownerId !== actorId) {
    throw new DomainError('BARBER_NOT_FOUND', 'This barber is not in your shop.');
  }
  barber.remove(deps.clock.now());
  await deps.persistRemoval(barber, actorId);
  return barber;
}

/** Bio and photo are per shop: each profile has its own. */
export async function updateBarberProfile(
  deps: ShopsDeps,
  actorId: string,
  barberId: string,
  patch: { bio?: string; avatarFileId?: string | null },
): Promise<Barber> {
  const barber = await requireOwnBarber(deps, actorId, barberId);
  await assertOwnFile(deps, actorId, patch.avatarFileId);
  barber.updateProfile(patch);
  await deps.barbers.save(barber);
  return barber;
}
