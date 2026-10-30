import { DomainError } from '../../../shared/domain/domain-error.js';
import type { Barber } from '../domain/barber.js';
import type { Barbershop } from '../domain/barbershop.js';
import type { ShopsDeps } from './ports.js';

/** The shop the actor owns; owner-only operations act on it. */
export async function requireOwnedShop(
  deps: Pick<ShopsDeps, 'shops'>,
  actorId: string,
): Promise<Barbershop> {
  const shop = await deps.shops.findByOwner(actorId);
  if (!shop) throw new DomainError('NOT_SHOP_OWNER', 'Only the shop owner can do this.');
  return shop;
}

export async function requireActiveBarber(
  deps: Pick<ShopsDeps, 'barbers'>,
  actorId: string,
): Promise<Barber> {
  const barber = await deps.barbers.findActiveByUser(actorId);
  if (!barber) throw new DomainError('NOT_A_BARBER', 'You are not a barber in any shop.');
  return barber;
}

export async function assertNotBarbering(deps: Pick<ShopsDeps, 'barbers'>, userId: string) {
  if (await deps.barbers.findActiveByUser(userId)) {
    throw new DomainError('ALREADY_A_BARBER', 'This person is already a barber in a shop.');
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
