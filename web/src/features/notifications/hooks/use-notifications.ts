import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  type Notification,
} from '../api/notifications';

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  list: ['notifications', 'list'] as const,
};

/** Polled every minute; the live agenda also invalidates it when a booking changes. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });
}

export function useNotifications({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => fetchNotifications(),
    enabled,
  });
}

/** Optimistic: the item reads as read and the count drops at once; a failure puts them back. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const list = queryClient.getQueryData<Notification[]>(notificationKeys.list);
      const unread = queryClient.getQueryData<number>(notificationKeys.unread);
      queryClient.setQueryData<Notification[]>(notificationKeys.list, (items) =>
        items?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      queryClient.setQueryData<number>(notificationKeys.unread, (count) =>
        count ? count - 1 : count,
      );
      return { list, unread };
    },
    onError: (_error, _id, previous) => {
      queryClient.setQueryData(notificationKeys.list, previous?.list);
      queryClient.setQueryData(notificationKeys.unread, previous?.unread);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
