import { DomainError } from '../../../shared/domain/domain-error.js';
import { Barbershop } from '../domain/barbershop.js';
import { Location } from '../domain/location.js';
import { assertOwnFile, requireOwnedShop } from './guards.js';
import type { ShopsDeps } from './ports.js';

export type BarbershopInput = {
  name: string;
  description: string;
  foundedYear: number;
  logoFileId: string | null;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export const MAX_RADIUS_KM = 50;
export const MAX_PAGE = 50;
const clampLimit = (limit: number) => Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE);

export async function createBarbershop(
  deps: ShopsDeps,
  actorId: string,
  input: BarbershopInput,
): Promise<Barbershop> {
  if (await deps.shops.findByOwner(actorId)) {
    throw new DomainError('SHOP_ALREADY_OWNED', 'You already own a barbershop.');
  }
  await assertOwnFile(deps, actorId, input.logoFileId);
  const { latitude, longitude, ...rest } = input;
  const shop = Barbershop.create(
    { ...rest, ownerId: actorId, location: Location.of(latitude, longitude) },
    deps.clock.now(),
  );
  await deps.shops.save(shop);
  return shop;
}

export async function updateBarbershop(
  deps: ShopsDeps,
  actorId: string,
  patch: Partial<BarbershopInput>,
): Promise<Barbershop> {
  const shop = await requireOwnedShop(deps, actorId);
  await assertOwnFile(deps, actorId, patch.logoFileId);
  const { latitude, longitude, ...rest } = patch;
  const moved =
    latitude !== undefined || longitude !== undefined
      ? {
          location: Location.of(
            latitude ?? shop.location.latitude,
            longitude ?? shop.location.longitude,
          ),
        }
      : {};
  shop.update({ ...rest, ...moved }, deps.clock.now());
  await deps.shops.save(shop);
  return shop;
}

export async function getBarbershop(deps: Pick<ShopsDeps, 'shops'>, id: string) {
  const shop = await deps.shops.findById(id);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Barbershop not found.');
  return shop;
}

export async function findNearby(
  deps: Pick<ShopsDeps, 'shops'>,
  input: { latitude: number; longitude: number; radiusKm: number; limit: number },
) {
  if (!(input.radiusKm > 0 && input.radiusKm <= MAX_RADIUS_KM)) {
    throw new DomainError(
      'INVALID_RADIUS',
      `Radius must be more than 0 and at most ${MAX_RADIUS_KM} km.`,
    );
  }
  const from = Location.of(input.latitude, input.longitude);
  return deps.shops.findNearby(from, input.radiusKm, clampLimit(input.limit));
}

export async function searchBarbershops(
  deps: Pick<ShopsDeps, 'shops'>,
  input: { query: string; limit: number; offset: number },
) {
  const query = input.query.trim();
  if (query.length < 2) {
    throw new DomainError('INVALID_SEARCH', 'Type at least 2 characters to search.');
  }
  return deps.shops.search(query, clampLimit(input.limit), Math.max(0, Math.trunc(input.offset)));
}
