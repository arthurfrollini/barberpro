import { DomainError } from '../../../shared/domain/domain-error.js';
import type { Barber } from '../domain/barber.js';
import type { Barbershop } from '../domain/barbershop.js';
import type { ShopsDeps } from './ports.js';

/**
 * The shop, if the actor owns it. A shop that does not exist answers the same as someone
 * else's, so ids cannot be probed.
 */
export async function requireOwnedShop(
  deps: Pick<ShopsDeps, 'shops'>,
  actorId: string,
  shopId: string,
): Promise<Barbershop> {
  const shop = await deps.shops.findById(shopId);
  if (!shop || shop.ownerId !== actorId) {
    throw new DomainError('NOT_SHOP_OWNER', 'Only the shop owner can do this.');
  }
  return shop;
}

/** The actor's own active barber profile with this id. */
export async function requireOwnBarber(
  deps: Pick<ShopsDeps, 'barbers'>,
  actorId: string,
  barberId: string,
): Promise<Barber> {
  const barber = await deps.barbers.findById(barberId);
  if (!barber || barber.userId !== actorId || !barber.isActive) {
    throw new DomainError('NOT_A_BARBER', 'You are not this barber.');
  }
  return barber;
}

/** One profile per person per shop; other shops are fine. */
export async function assertNotBarberingIn(
  deps: Pick<ShopsDeps, 'barbers'>,
  userId: string,
  shopId: string,
) {
  if (await deps.barbers.findActiveInShop(userId, shopId)) {
    throw new DomainError('ALREADY_A_BARBER', 'This person is already a barber in this shop.');
  }
}

/** An uploaded image can only be used by the user who uploaded it. */
export async function assertOwnFile(
  deps: Pick<ShopsDeps, 'files'>,
  actorId: string,
  fileId: string | null | undefined,
): Promise<void> {
  if (!fileId) return;
  const file = await deps.files.findById(fileId);
  if (!file || file.ownerId !== actorId) {
    throw new DomainError('FILE_NOT_FOUND', 'Upload the image first, then use its id.');
  }
}
