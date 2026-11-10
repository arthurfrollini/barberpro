import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TypeOrmPushTokenRepository } from '../../../src/modules/notifications/adapters/persistence/typeorm-push-token-repository.js';
import { closeTestDataSource, testDataSource, truncateAll } from '../../support/db.js';
import { seedShop } from '../../support/seed.js';

const at = (iso: string) => new Date(iso);

describe('push token repository', () => {
  let ds: DataSource;
  let repo: TypeOrmPushTokenRepository;

  beforeAll(async () => {
    ds = await testDataSource();
    repo = new TypeOrmPushTokenRepository(ds.manager);
  });
  beforeEach(() => truncateAll(ds));
  afterAll(closeTestDataSource);

  it('keeps one row per device, and a phone that signs in as someone else moves to them', async () => {
    const seed = await seedShop(ds);
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');
    await repo.save({
      token: 'ExpoPushToken[a]',
      userId: ana.id,
      platform: 'ios',
      at: at('2026-11-10T10:00:00Z'),
    });
    await repo.save({
      token: 'ExpoPushToken[b]',
      userId: ana.id,
      platform: 'android',
      at: at('2026-11-10T10:00:00Z'),
    });
    await repo.save({
      token: 'ExpoPushToken[a]',
      userId: bia.id,
      platform: 'ios',
      at: at('2026-11-10T11:00:00Z'),
    });

    expect(await repo.forUser(ana.id)).toEqual([
      { token: 'ExpoPushToken[b]', platform: 'android' },
    ]);
    expect(await repo.forUser(bia.id)).toEqual([{ token: 'ExpoPushToken[a]', platform: 'ios' }]);
  });

  it('removes a token only for its owner', async () => {
    const seed = await seedShop(ds);
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');
    await repo.save({
      token: 'ExpoPushToken[a]',
      userId: ana.id,
      platform: 'ios',
      at: at('2026-11-10T10:00:00Z'),
    });

    expect(await repo.remove('ExpoPushToken[a]', bia.id)).toBe(false);
    expect(await repo.forUser(ana.id)).toHaveLength(1);
    expect(await repo.remove('ExpoPushToken[a]', ana.id)).toBe(true);
    expect(await repo.forUser(ana.id)).toEqual([]);
  });

  it('drops dead tokens by value, and a deleted user takes theirs along', async () => {
    const seed = await seedShop(ds);
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');
    for (const [token, userId] of [
      ['ExpoPushToken[a]', ana.id],
      ['ExpoPushToken[b]', ana.id],
      ['ExpoPushToken[c]', bia.id],
    ] as const) {
      await repo.save({ token, userId, platform: 'ios', at: at('2026-11-10T10:00:00Z') });
    }

    await repo.removeTokens(['ExpoPushToken[a]', 'ExpoPushToken[unknown]']);
    expect(await repo.forUser(ana.id)).toEqual([{ token: 'ExpoPushToken[b]', platform: 'ios' }]);
    await repo.removeTokens([]);

    await ds.query('DELETE FROM users WHERE id = $1', [bia.id]);
    expect(await ds.query('SELECT token FROM push_tokens ORDER BY token')).toEqual([
      { token: 'ExpoPushToken[b]' },
    ]);
  });
});
