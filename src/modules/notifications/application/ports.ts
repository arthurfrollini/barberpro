import type { Notification } from '../domain/notification.js';

export interface NotificationRepository {
  insert(notifications: Notification[]): Promise<void>;
  /** Newest first. */
  listForUser(userId: string, page: { limit: number; offset: number }): Promise<Notification[]>;
  /** Marks it read if it belongs to `userId`; false when there is no such notification. */
  markRead(id: string, userId: string, at: Date): Promise<boolean>;
  unreadCount(userId: string): Promise<number>;
}
