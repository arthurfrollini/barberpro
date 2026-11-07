import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { useApi } from '@/shared/api';
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

/**
 * The tab badge. No push yet: polled every minute while the app is open, and refetched when
 * it comes back to the foreground.
 */
export function useUnreadCount() {
  const api = useApi();
  const signedIn = useIsSignedIn();
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => fetchUnreadCount(api),
    enabled: signedIn,
    refetchInterval: 60_000,
  });
}

export function useNotifications() {
  const api = useApi();
  const signedIn = useIsSignedIn();
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => fetchNotifications(api),
    enabled: signedIn,
  });
}

/** Optimistic: the item reads as read and the badge drops at once; a failure puts them back. */
export function useMarkRead() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(api, id),
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
