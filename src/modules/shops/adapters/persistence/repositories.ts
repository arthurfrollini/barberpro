import { type EntityManager, In, IsNull } from 'typeorm';
import { isUniqueViolation } from '../../../../shared/adapters/database/unique-violation.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import type { Email } from '../../../identity/domain/email.js';
import type {
  BarberRepository,
  BarbershopRepository,
  InviteRepository,
  ServiceRepository,
} from '../../application/ports.js';
import type { Barber } from '../../domain/barber.js';
import type { Barbershop } from '../../domain/barbershop.js';
import type { Invite } from '../../domain/invite.js';
import type { Location } from '../../domain/location.js';
import type { Service } from '../../domain/service.js';
import { barberMapper, barbershopMapper, inviteMapper, serviceMapper } from './mappers.js';
import { BarberRecord, BarbershopRecord, InviteRecord, ServiceRecord } from './records.js';

const POINT = 'ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography';

/** Re-throws a unique violation on `constraint` as a domain error. */
async function guardUnique(
  write: Promise<unknown>,
  constraint: string,
  toError: () => DomainError,
): Promise<void> {
  try {
    await write;
  } catch (error) {
    if (isUniqueViolation(error, constraint)) throw toError();
    throw error;
  }
}

export class TypeOrmBarbershopRepository implements BarbershopRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    const r = await this.manager.findOneBy(BarbershopRecord, { id });
    return r ? barbershopMapper.toDomain(r) : null;
  }

  async findByIds(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const rows = await this.manager.findBy(BarbershopRecord, { id: In([...ids]) });
    return rows.map(barbershopMapper.toDomain);
  }

  async findByOwner(ownerId: string) {
    const r = await this.manager.findOneBy(BarbershopRecord, { ownerId });
    return r ? barbershopMapper.toDomain(r) : null;
  }

  async findNearby(from: Location, radiusKm: number, limit: number) {
    // ST_DWithin on geography uses the gist index and works in meters
    const { entities, raw } = await this.manager
      .createQueryBuilder(BarbershopRecord, 's')
      .addSelect(`ST_Distance(s.location, ${POINT}) / 1000`, 'distance_km')
      .where(`ST_DWithin(s.location, ${POINT}, :meters)`)
      .orderBy('distance_km', 'ASC')
      .limit(limit)
      .setParameters({ lng: from.longitude, lat: from.latitude, meters: radiusKm * 1000 })
      .getRawAndEntities<{ s_id: string; distance_km: number }>();
    const distance = new Map(raw.map((row) => [row.s_id, Number(row.distance_km)]));
    return entities.map((r) => ({
      shop: barbershopMapper.toDomain(r),
      distanceKm: distance.get(r.id) ?? 0,
    }));
  }

  async search(query: string, limit: number, offset: number) {
    // word_similarity: "barbaria" still finds "Mega Barbearia SP"; served by the trigram index
    const rows = await this.manager
      .createQueryBuilder(BarbershopRecord, 's')
      .addSelect('word_similarity(lower(:q), lower(s.name))', 'score')
      .where('lower(:q) <% lower(s.name)', { q: query })
      .orderBy('score', 'DESC')
      .addOrderBy('s.name', 'ASC')
      .offset(offset)
      .limit(limit)
      .getMany();
    return rows.map(barbershopMapper.toDomain);
  }

  async save(shop: Barbershop) {
    await guardUnique(
      this.manager.upsert(BarbershopRecord, barbershopMapper.toRecord(shop), ['id']),
      'barbershops_owner_id_key',
      () => new DomainError('SHOP_ALREADY_OWNED', 'You already own a barbershop.'),
    );
  }
}

export class TypeOrmBarberRepository implements BarberRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    const r = await this.manager.findOneBy(BarberRecord, { id });
    return r ? barberMapper.toDomain(r) : null;
  }

  async findByIds(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return (await this.manager.findBy(BarberRecord, { id: In([...ids]) })).map(
      barberMapper.toDomain,
    );
  }

  async findActiveByUser(userId: string) {
    const r = await this.manager.findOneBy(BarberRecord, { userId, removedAt: IsNull() });
    return r ? barberMapper.toDomain(r) : null;
  }

  async findActiveByShops(shopIds: readonly string[]) {
    if (shopIds.length === 0) return [];
    const rows = await this.manager.find(BarberRecord, {
      where: { shopId: In([...shopIds]), removedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return rows.map(barberMapper.toDomain);
  }

  async save(barber: Barber) {
    await guardUnique(
      this.manager.upsert(BarberRecord, barberMapper.toRecord(barber), ['id']),
      'barbers_active_user_idx',
      () => new DomainError('ALREADY_A_BARBER', 'This person is already a barber in a shop.'),
    );
  }
}

export class TypeOrmInviteRepository implements InviteRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    const r = await this.manager.findOneBy(InviteRecord, { id });
    return r ? inviteMapper.toDomain(r) : null;
  }

  async findByTokenHash(tokenHash: string) {
    const r = await this.manager.findOneBy(InviteRecord, { tokenHash });
    return r ? inviteMapper.toDomain(r) : null;
  }

  async findOpen(shopId: string, email: Email) {
    const r = await this.manager.findOneBy(InviteRecord, {
      shopId,
      email: email.value,
      acceptedAt: IsNull(),
      revokedAt: IsNull(),
    });
    return r ? inviteMapper.toDomain(r) : null;
  }

  async listByShop(shopId: string) {
    const rows = await this.manager.find(InviteRecord, {
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(inviteMapper.toDomain);
  }

  async save(invite: Invite) {
    await guardUnique(
      this.manager.upsert(InviteRecord, inviteMapper.toRecord(invite), ['id']),
      'invites_open_idx',
      () => new DomainError('INVITE_ALREADY_SENT', 'An invite to this email is still pending.'),
    );
  }
}

export class TypeOrmServiceRepository implements ServiceRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    const r = await this.manager.findOneBy(ServiceRecord, { id });
    return r ? serviceMapper.toDomain(r) : null;
  }

  async findByBarbers(barberIds: readonly string[], includeArchived = false) {
    if (barberIds.length === 0) return [];
    const rows = await this.manager.find(ServiceRecord, {
      where: {
        barberId: In([...barberIds]),
        ...(includeArchived ? {} : { archivedAt: IsNull() }),
      },
      order: { createdAt: 'ASC' },
    });
    return rows.map(serviceMapper.toDomain);
  }

  async save(service: Service) {
    await this.manager.upsert(ServiceRecord, serviceMapper.toRecord(service), ['id']);
  }
}

export function shopsRepositories(manager: EntityManager) {
  return {
    shops: new TypeOrmBarbershopRepository(manager),
    barbers: new TypeOrmBarberRepository(manager),
    invites: new TypeOrmInviteRepository(manager),
    services: new TypeOrmServiceRepository(manager),
  };
}
