import { type EntityManager, In, IsNull } from 'typeorm';
import { isUniqueViolation } from '../../../../shared/adapters/database/unique-violation.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { isUuid } from '../../../../shared/domain/uuid.js';
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
    if (!isUuid(id)) return null;
    const r = await this.manager.findOneBy(BarbershopRecord, { id });
    return r ? barbershopMapper.toDomain(r) : null;
  }

  async findByIds(ids: readonly string[]) {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    const rows = await this.manager.findBy(BarbershopRecord, { id: In(valid) });
    return rows.map(barbershopMapper.toDomain);
  }

  async listByOwner(ownerId: string) {
    if (!isUuid(ownerId)) return [];
    const rows = await this.manager.find(BarbershopRecord, {
      where: { ownerId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map(barbershopMapper.toDomain);
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
    await this.manager.upsert(BarbershopRecord, barbershopMapper.toRecord(shop), ['id']);
  }
}

export class TypeOrmBarberRepository implements BarberRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    if (!isUuid(id)) return null;
    const r = await this.manager.findOneBy(BarberRecord, { id });
    return r ? barberMapper.toDomain(r) : null;
  }

  async findByIds(ids: readonly string[]) {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    return (await this.manager.findBy(BarberRecord, { id: In(valid) })).map(barberMapper.toDomain);
  }

  async listActiveByUser(userId: string) {
    if (!isUuid(userId)) return [];
    const rows = await this.manager.find(BarberRecord, {
      where: { userId, removedAt: IsNull() },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map(barberMapper.toDomain);
  }

  async findActiveInShop(userId: string, shopId: string) {
    if (!isUuid(userId) || !isUuid(shopId)) return null;
    const r = await this.manager.findOneBy(BarberRecord, { userId, shopId, removedAt: IsNull() });
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
    const r = barberMapper.toRecord(barber);
    // removed_at never goes back to null: a stale copy saved after a removal cannot undo it
    const write = this.manager.query(
      `INSERT INTO barbers (id, shop_id, user_id, bio, avatar_file_id, created_at, removed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         bio = EXCLUDED.bio,
         avatar_file_id = EXCLUDED.avatar_file_id,
         removed_at = COALESCE(barbers.removed_at, EXCLUDED.removed_at)`,
      [r.id, r.shopId, r.userId, r.bio, r.avatarFileId, r.createdAt, r.removedAt],
    );
    await guardUnique(
      write,
      'barbers_active_user_shop_idx',
      () => new DomainError('ALREADY_A_BARBER', 'This person is already a barber in this shop.'),
    );
  }
}

export class TypeOrmInviteRepository implements InviteRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    if (!isUuid(id)) return null;
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

  async markAccepted(id: string, at: Date): Promise<boolean> {
    // conditional: of an accept racing a revoke (or another accept), only one wins
    const result = await this.manager
      .createQueryBuilder()
      .update(InviteRecord)
      .set({ acceptedAt: at })
      .where('id = :id AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > :at', {
        id,
        at,
      })
      .execute();
    return result.affected === 1;
  }

  async save(invite: Invite) {
    const r = inviteMapper.toRecord(invite);
    // accepted_at and revoked_at are set once; a stale copy cannot clear them
    const write = this.manager.query(
      `INSERT INTO invites
         (id, shop_id, email, token_hash, invited_by, expires_at, accepted_at, revoked_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         accepted_at = COALESCE(invites.accepted_at, EXCLUDED.accepted_at),
         revoked_at = COALESCE(invites.revoked_at, EXCLUDED.revoked_at)`,
      [
        r.id,
        r.shopId,
        r.email,
        r.tokenHash,
        r.invitedBy,
        r.expiresAt,
        r.acceptedAt,
        r.revokedAt,
        r.createdAt,
      ],
    );
    await guardUnique(
      write,
      'invites_open_idx',
      () => new DomainError('INVITE_ALREADY_SENT', 'An invite to this email is still pending.'),
    );
  }
}

export class TypeOrmServiceRepository implements ServiceRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string) {
    if (!isUuid(id)) return null;
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
