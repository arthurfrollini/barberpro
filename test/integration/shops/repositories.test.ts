import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TypeOrmUserRepository } from '../../../src/modules/identity/adapters/persistence/typeorm-user-repository.js';
import { Email } from '../../../src/modules/identity/domain/email.js';
import { User } from '../../../src/modules/identity/domain/user.js';
import { shopsRepositories } from '../../../src/modules/shops/adapters/persistence/repositories.js';
import { Barber } from '../../../src/modules/shops/domain/barber.js';
import { Barbershop } from '../../../src/modules/shops/domain/barbershop.js';
import { Invite } from '../../../src/modules/shops/domain/invite.js';
import { Location } from '../../../src/modules/shops/domain/location.js';
import { Service } from '../../../src/modules/shops/domain/service.js';
import { closeTestDataSource, testDataSource, truncateAll } from '../../support/db.js';

const now = new Date('2026-11-02T12:00:00.000Z');
const paulista = Location.of(-23.5614, -46.6559);
const pinheiros = Location.of(-23.567, -46.692);
const itaquera = Location.of(-23.54, -46.456);

describe('shops repositories', () => {
  let ds: DataSource;
  let repos: ReturnType<typeof shopsRepositories>;
  let users: TypeOrmUserRepository;

  beforeAll(async () => {
    ds = await testDataSource();
    repos = shopsRepositories(ds.manager);
    users = new TypeOrmUserRepository(ds.manager);
  });
  beforeEach(() => truncateAll(ds));
  afterAll(closeTestDataSource);

  const user = async (email: string) => {
    const u = User.create({ name: email, email: Email.parse(email), passwordHash: 'h', now });
    await users.save(u);
    return u;
  };
  const shop = async (name: string, location: Location, ownerEmail = `${name}@x.com`) => {
    const s = Barbershop.create(
      {
        ownerId: (await user(ownerEmail.replace(/\s/g, ''))).id,
        name,
        description: '',
        foundedYear: 2010,
        logoFileId: null,
        address: 'Rua 1',
        location,
        timezone: 'America/Sao_Paulo',
      },
      now,
    );
    await repos.shops.save(s);
    return s;
  };

  it('round-trips a shop with its location', async () => {
    const s = await shop('Mega Barbearia SP', paulista);

    const found = await repos.shops.findById(s.id);

    expect(found?.name).toBe('Mega Barbearia SP');
    expect(found?.location.latitude).toBeCloseTo(-23.5614, 6);
    expect(found?.location.longitude).toBeCloseTo(-46.6559, 6);
    expect((await repos.shops.findByOwner(s.ownerId))?.id).toBe(s.id);
  });

  it('finds shops within the radius, nearest first', async () => {
    await shop('Itaquera', itaquera);
    await shop('Pinheiros', pinheiros);
    await shop('Paulista', paulista);

    const near = await repos.shops.findNearby(paulista, 10, 20);

    expect(near.map((n) => n.shop.name)).toEqual(['Paulista', 'Pinheiros']);
    expect(near[0]!.distanceKm).toBeCloseTo(0, 3);
    expect(near[1]!.distanceKm).toBeGreaterThan(3);
    expect(near[1]!.distanceKm).toBeLessThan(5);
  });

  it('searches names with typos, best match first', async () => {
    await shop('Mega Barbearia SP', paulista);
    await shop('Corte Fino', pinheiros);

    expect((await repos.shops.search('barbaria', 20, 0)).map((s) => s.name)).toEqual([
      'Mega Barbearia SP',
    ]);
    expect((await repos.shops.search('MEGA', 20, 0)).map((s) => s.name)).toEqual([
      'Mega Barbearia SP',
    ]);
    expect(await repos.shops.search('xyz', 20, 0)).toEqual([]);
  });

  it('keeps one active barber row per user', async () => {
    const s = await shop('Mega', paulista);
    const jose = await user('jose@x.com');
    const first = Barber.create({ shopId: s.id, userId: jose.id }, now);
    await repos.barbers.save(first);

    await expect(
      repos.barbers.save(Barber.create({ shopId: s.id, userId: jose.id }, now)),
    ).rejects.toEqual(expect.objectContaining({ code: 'ALREADY_A_BARBER' }));

    first.remove(now);
    await repos.barbers.save(first);
    await repos.barbers.save(Barber.create({ shopId: s.id, userId: jose.id }, now));
    expect((await repos.barbers.findActiveByShops([s.id])).map((b) => b.userId)).toEqual([jose.id]);
  });

  it('stores invites and finds the open one by email', async () => {
    const s = await shop('Mega', paulista);
    const invite = Invite.create(
      {
        shopId: s.id,
        email: Email.parse('jose@x.com'),
        tokenHash: 'a'.repeat(64),
        invitedBy: s.ownerId,
      },
      now,
    );
    await repos.invites.save(invite);

    expect((await repos.invites.findOpen(s.id, Email.parse('JOSE@x.com')))?.id).toBe(invite.id);
    expect((await repos.invites.findByTokenHash('a'.repeat(64)))?.status(now)).toBe('pending');

    invite.revoke(now);
    await repos.invites.save(invite);
    expect(await repos.invites.findOpen(s.id, Email.parse('jose@x.com'))).toBeNull();
    expect(await repos.invites.listByShop(s.id)).toHaveLength(1);
  });

  it('lists active services per barber and hides archived ones', async () => {
    const s = await shop('Mega', paulista);
    const barber = Barber.create({ shopId: s.id, userId: (await user('jose@x.com')).id }, now);
    await repos.barbers.save(barber);
    const corte = Service.create(
      {
        barberId: barber.id,
        name: 'Corte',
        description: '',
        priceCents: 5000,
        durationMinutes: 15,
      },
      now,
    );
    const barba = Service.create(
      {
        barberId: barber.id,
        name: 'Barba',
        description: '',
        priceCents: 3000,
        durationMinutes: 20,
      },
      now,
    );
    await repos.services.save(corte);
    await repos.services.save(barba);
    barba.archive(now);
    await repos.services.save(barba);

    expect((await repos.services.findByBarbers([barber.id])).map((x) => x.name)).toEqual(['Corte']);
    expect(await repos.services.findByBarbers([barber.id], true)).toHaveLength(2);
    expect((await repos.services.findById(corte.id))?.priceCents).toBe(5000);
  });
});
