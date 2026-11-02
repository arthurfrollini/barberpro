import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TypeOrmNotificationRepository } from '../../../src/modules/notifications/adapters/persistence/typeorm-notification-repository.js';
import { Notification } from '../../../src/modules/notifications/domain/notification.js';
import { closeTestDataSource, testDataSource, truncateAll } from '../../support/db.js';
import { seedShop } from '../../support/seed.js';

const at = (iso: string) => new Date(iso);

describe('notification repository', () => {
  let ds: DataSource;
  let repo: TypeOrmNotificationRepository;

  beforeAll(async () => {
    ds = await testDataSource();
    repo = new TypeOrmNotificationRepository(ds.manager);
  });
  beforeEach(() => truncateAll(ds));
  afterAll(closeTestDataSource);

  const note = (userId: string, title: string, when: string) =>
    Notification.create(
      { userId, type: 'appointment_booked', title, body: 'Ana, Mon 14:00', appointmentId: null },
      at(when),
    );

  it('lists a user notifications newest first and counts the unread ones', async () => {
    const seed = await seedShop(ds);
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');
    await repo.insert([
      note(ana.id, 'first', '2026-11-02T10:00:00Z'),
      note(ana.id, 'second', '2026-11-02T11:00:00Z'),
      note(bia.id, 'other', '2026-11-02T12:00:00Z'),
    ]);

    const list = await repo.listForUser(ana.id, { limit: 20, offset: 0 });

    expect(list.map((n) => n.title)).toEqual(['second', 'first']);
    expect(await repo.unreadCount(ana.id)).toBe(2);
  });

  it('marks as read only for the notification owner', async () => {
    const seed = await seedShop(ds);
    const ana = await seed.user('ana');
    const bia = await seed.user('bia');
    const n = note(ana.id, 'hello', '2026-11-02T10:00:00Z');
    await repo.insert([n]);

    expect(await repo.markRead(n.id, bia.id, at('2026-11-02T13:00:00Z'))).toBe(false);
    expect(await repo.markRead(n.id, ana.id, at('2026-11-02T13:00:00Z'))).toBe(true);

    const [stored] = await repo.listForUser(ana.id, { limit: 1, offset: 0 });
    expect(stored?.readAt).toEqual(at('2026-11-02T13:00:00Z'));
    expect(await repo.unreadCount(ana.id)).toBe(0);
  });
});
