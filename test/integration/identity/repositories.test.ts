import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TypeOrmRefreshTokenRepository } from '../../../src/modules/identity/adapters/persistence/typeorm-refresh-token-repository.js';
import { TypeOrmUserRepository } from '../../../src/modules/identity/adapters/persistence/typeorm-user-repository.js';
import { Email } from '../../../src/modules/identity/domain/email.js';
import { User } from '../../../src/modules/identity/domain/user.js';
import { closeTestDataSource, testDataSource, truncateAll } from '../../support/db.js';

const now = new Date('2026-11-02T12:00:00.000Z');

describe('identity repositories', () => {
  let ds: DataSource;
  let users: TypeOrmUserRepository;
  let tokens: TypeOrmRefreshTokenRepository;

  beforeAll(async () => {
    ds = await testDataSource();
    users = new TypeOrmUserRepository(ds.manager);
    tokens = new TypeOrmRefreshTokenRepository(ds.manager);
  });
  beforeEach(() => truncateAll(ds));
  afterAll(closeTestDataSource);

  const newUser = () =>
    User.create({ name: 'Ana', email: Email.parse('ana@x.com'), passwordHash: 'h', now });

  it('saves a user and finds it by id and by email', async () => {
    const user = newUser();
    await users.save(user);

    const byId = await users.findById(user.id);
    const byEmail = await users.findByEmail(Email.parse('ANA@x.com'));

    expect(byId?.email.value).toBe('ana@x.com');
    expect(byId?.createdAt).toEqual(now);
    expect(byEmail?.id).toBe(user.id);
    expect(await users.findById(randomUUID())).toBeNull();
  });

  it('updates an existing user on save', async () => {
    const user = newUser();
    await users.save(user);
    user.rename('Ana Souza', new Date('2026-11-03T00:00:00Z'));

    await users.save(user);

    expect((await users.findById(user.id))?.name).toBe('Ana Souza');
  });

  it('stores refresh tokens and revokes each one only once', async () => {
    const user = newUser();
    await users.save(user);
    const id = randomUUID();
    await tokens.create({ id, userId: user.id, tokenHash: 'a'.repeat(64), expiresAt: now });

    const found = await tokens.findByHash('a'.repeat(64));
    expect(found).toMatchObject({ id, userId: user.id, revokedAt: null, expiresAt: now });

    expect(await tokens.revoke(id, now)).toBe(true);
    expect(await tokens.revoke(id, now)).toBe(false);
    expect((await tokens.findByHash('a'.repeat(64)))?.revokedAt).toEqual(now);
  });

  it('revokes every active token of a user', async () => {
    const user = newUser();
    await users.save(user);
    for (const c of ['b', 'c']) {
      await tokens.create({
        id: randomUUID(),
        userId: user.id,
        tokenHash: c.repeat(64),
        expiresAt: now,
      });
    }

    await tokens.revokeAllForUser(user.id, now);

    expect((await tokens.findByHash('b'.repeat(64)))?.revokedAt).toEqual(now);
    expect((await tokens.findByHash('c'.repeat(64)))?.revokedAt).toEqual(now);
  });
});
