import DataLoader from 'dataloader';
import type { UserRepository } from '../../../identity/application/ports.js';
import type { User } from '../../../identity/domain/user.js';
import type { ShopsDeps } from '../../application/ports.js';
import type { Barber } from '../../domain/barber.js';
import type { Barbershop } from '../../domain/barbershop.js';
import type { Service } from '../../domain/service.js';

/** Groups items by key in the order DataLoader asked for the keys. */
function groupBy<T>(keys: readonly string[], items: T[], keyOf: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>(keys.map((k) => [k, []]));
  for (const item of items) groups.get(keyOf(item))?.push(item);
  return keys.map((k) => groups.get(k) ?? []);
}

function byId<T extends { id: string }>(keys: readonly string[], items: T[]): (T | null)[] {
  const found = new Map(items.map((i) => [i.id, i]));
  return keys.map((k) => found.get(k) ?? null);
}

/**
 * One set per request: everything a list asks for in the same tick becomes one query
 * (WHERE id IN (...)), and the cache never outlives the request.
 */
export function createShopsLoaders(
  deps: Pick<ShopsDeps, 'shops' | 'barbers' | 'services'>,
  users: Pick<UserRepository, 'findByIds'>,
) {
  return {
    shopById: new DataLoader<string, Barbershop | null>(async (ids) =>
      byId(ids, await deps.shops.findByIds(ids)),
    ),
    barberById: new DataLoader<string, Barber | null>(async (ids) =>
      byId(ids, await deps.barbers.findByIds(ids)),
    ),
    barbersByShop: new DataLoader<string, Barber[]>(async (shopIds) =>
      groupBy(shopIds, await deps.barbers.findActiveByShops(shopIds), (b) => b.shopId),
    ),
    servicesByBarber: new DataLoader<string, Service[]>(async (barberIds) =>
      groupBy(barberIds, await deps.services.findByBarbers(barberIds), (s) => s.barberId),
    ),
    userById: new DataLoader<string, User | null>(async (ids) =>
      byId(ids, await users.findByIds(ids)),
    ),
  };
}

export type ShopsLoaders = ReturnType<typeof createShopsLoaders>;
