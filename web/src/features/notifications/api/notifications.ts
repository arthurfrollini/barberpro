import { graphql } from '@/gql';
import { api } from '@/shared/api';

const UnreadCountQuery = graphql(`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`);

const NotificationsQuery = graphql(`
  query Notifications($limit: Int) {
    notifications(limit: $limit) {
      id
      type
      title
      body
      read
      createdAt
      appointmentStartsAt
      appointment {
        id
        startsAt
        serviceName
        cancelReason
        customer {
          id
          name
        }
        barber {
          name
        }
      }
    }
  }
`);

const MarkReadMutation = graphql(`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id)
  }
`);

export const fetchUnreadCount = async () =>
  (await api.request(UnreadCountQuery)).unreadNotificationCount;

export const fetchNotifications = async (limit = 20) =>
  (await api.request(NotificationsQuery, { limit })).notifications;

export const markNotificationRead = async (id: string) => {
  await api.request(MarkReadMutation, { id });
};

export type Notification = Awaited<ReturnType<typeof fetchNotifications>>[number];
