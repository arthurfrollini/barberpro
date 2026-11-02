import { type EntityManager, IsNull } from 'typeorm';
import { isUuid } from '../../../../shared/domain/uuid.js';
import type { NotificationRepository } from '../../application/ports.js';
import { Notification } from '../../domain/notification.js';
import { NotificationRecord } from './notification.record.js';

export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(private readonly manager: EntityManager) {}

  async insert(notifications: Notification[]) {
    if (notifications.length === 0) return;
    await this.manager.insert(
      NotificationRecord,
      notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        appointmentId: n.appointmentId,
        appointmentStartsAt: n.appointmentStartsAt,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    );
  }

  async listForUser(userId: string, page: { limit: number; offset: number }) {
    const rows = await this.manager.find(NotificationRecord, {
      where: { userId },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: page.limit,
      skip: page.offset,
    });
    return rows.map((r) => Notification.restore({ ...r }));
  }

  async markRead(id: string, userId: string, at: Date) {
    if (!isUuid(id)) return false;
    const owned = await this.manager.existsBy(NotificationRecord, { id, userId });
    if (!owned) return false;
    // already read keeps its first read time
    await this.manager.update(NotificationRecord, { id, userId, readAt: IsNull() }, { readAt: at });
    return true;
  }

  async unreadCount(userId: string) {
    return this.manager.countBy(NotificationRecord, { userId, readAt: IsNull() });
  }
}
