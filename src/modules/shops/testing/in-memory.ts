import type { Clock } from '../../../shared/application/clock.js';
import type { FileRepository, StoredFile } from '../../../shared/application/files.js';
import type { Email } from '../../identity/domain/email.js';
import { InMemoryUserRepository } from '../../identity/testing/in-memory.js';
import type {
  BarberRepository,
  BarbershopRepository,
  InviteRepository,
  MailMessage,
  Mailer,
  ServiceRepository,
  ShopsDeps,
  ShopsRepositories,
} from '../application/ports.js';
import type { Barber } from '../domain/barber.js';
import type { Barbershop } from '../domain/barbershop.js';
import type { Invite } from '../domain/invite.js';
import type { Location } from '../domain/location.js';
import type { Service } from '../domain/service.js';

// These keep the domain objects themselves (no copies): enough for use case tests, where
// every change is followed by a save. The TypeORM adapters are covered by integration tests.

/** Great-circle distance, the same thing PostGIS computes on geography points. */
export function haversineKm(a: Location, b: Location): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}

export class InMemoryBarbershopRepository implements BarbershopRepository {
  readonly rows = new Map<string, Barbershop>();
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByIds(ids: readonly string[]) {
    return ids.flatMap((id) => this.rows.get(id) ?? []);
  }
  async listByOwner(ownerId: string) {
    return [...this.rows.values()].filter((s) => s.ownerId === ownerId);
  }
  async findNearby(from: Location, radiusKm: number, limit: number) {
    return [...this.rows.values()]
      .map((shop) => ({ shop, distanceKm: haversineKm(from, shop.location) }))
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }
  async search(query: string, limit: number, offset: number) {
    const q = query.toLowerCase();
    return [...this.rows.values()]
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(offset, offset + limit);
  }
  async save(shop: Barbershop) {
    this.rows.set(shop.id, shop);
  }
}

export class InMemoryBarberRepository implements BarberRepository {
  readonly rows = new Map<string, Barber>();
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByIds(ids: readonly string[]) {
    return ids.flatMap((id) => this.rows.get(id) ?? []);
  }
  async listActiveByUser(userId: string) {
    return [...this.rows.values()].filter((b) => b.userId === userId && b.isActive);
  }
  async findActiveInShop(userId: string, shopId: string) {
    return (
      [...this.rows.values()].find(
        (b) => b.userId === userId && b.shopId === shopId && b.isActive,
      ) ?? null
    );
  }
  async findActiveByShops(shopIds: readonly string[]) {
    return [...this.rows.values()].filter((b) => shopIds.includes(b.shopId) && b.isActive);
  }
  async save(barber: Barber) {
    this.rows.set(barber.id, barber);
  }
}

export class InMemoryInviteRepository implements InviteRepository {
  readonly rows = new Map<string, Invite>();
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByTokenHash(tokenHash: string) {
    return [...this.rows.values()].find((i) => i.tokenHash === tokenHash) ?? null;
  }
  async findOpen(shopId: string, email: Email) {
    return (
      [...this.rows.values()].find(
        (i) => i.shopId === shopId && i.email.equals(email) && !i.acceptedAt && !i.revokedAt,
      ) ?? null
    );
  }
  async listByShop(shopId: string) {
    return [...this.rows.values()].filter((i) => i.shopId === shopId);
  }
  async markAccepted(id: string, at: Date) {
    const invite = this.rows.get(id);
    if (!invite || invite.status(at) !== 'pending') return false;
    invite.accept(at);
    return true;
  }
  async save(invite: Invite) {
    this.rows.set(invite.id, invite);
  }
}

export class InMemoryServiceRepository implements ServiceRepository {
  readonly rows = new Map<string, Service>();
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByBarbers(barberIds: readonly string[], includeArchived = false) {
    return [...this.rows.values()].filter(
      (s) => barberIds.includes(s.barberId) && (includeArchived || !s.isArchived),
    );
  }
  async save(service: Service) {
    this.rows.set(service.id, service);
  }
}

export class InMemoryFileRepository implements FileRepository {
  readonly rows = new Map<string, StoredFile>();
  async create(file: StoredFile) {
    this.rows.set(file.id, file);
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
}

export class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  async send(message: MailMessage) {
    this.sent.push(message);
  }
}

export function inMemoryShopsDeps(clock: Clock) {
  let n = 0;
  const repos = {
    shops: new InMemoryBarbershopRepository(),
    barbers: new InMemoryBarberRepository(),
    invites: new InMemoryInviteRepository(),
    services: new InMemoryServiceRepository(),
  };
  return {
    ...repos,
    // no scheduling here: removal is just the save
    persistRemoval: (barber: Barber) => repos.barbers.save(barber),
    transaction: <T>(work: (r: ShopsRepositories) => Promise<T>) => work(repos),
    files: new InMemoryFileRepository(),
    users: new InMemoryUserRepository(),
    mailer: new FakeMailer(),
    secrets: { random: () => `token-${++n}`, hash: (raw: string) => `h(${raw})` },
    clock,
    inviteLink: (token: string) => `http://dash.test/convite?codigo=${encodeURIComponent(token)}`,
  } satisfies ShopsDeps;
}
