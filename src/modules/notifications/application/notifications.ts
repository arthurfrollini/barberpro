import { DomainError } from '../../../shared/domain/domain-error.js';
import type { NotificationRepository } from './ports.js';

type Deps = { notifications: NotificationRepository; clock: { now(): Date } };

export function listNotifications(
  deps: Deps,
  userId: string,
  page: { limit: number; offset: number },
) {
  return deps.notifications.listForUser(userId, {
    limit: Math.min(Math.max(Math.trunc(page.limit), 1), 50),
    offset: Math.max(0, Math.trunc(page.offset)),
  });
}

export async function markNotificationRead(deps: Deps, userId: string, id: string): Promise<void> {
  if (!(await deps.notifications.markRead(id, userId, deps.clock.now()))) {
    throw new DomainError('NOTIFICATION_NOT_FOUND', 'Notification not found.');
  }
}
