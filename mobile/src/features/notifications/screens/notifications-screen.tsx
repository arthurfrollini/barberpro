import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SignedOut } from '@/features/auth/components/signed-out';
import { useIsSignedIn, useMe } from '@/features/auth/hooks/use-auth';
import { useNow } from '@/shared/hooks/use-now';
import { formatRelative } from '@/shared/lib/time';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states';
import { Text } from '@/shared/ui/text';
import { colors, hairline, space } from '@/shared/ui/theme';
import type { Notification } from '../api/notifications';
import { useMarkRead, useNotifications } from '../hooks/use-notifications';
import { describeNotification } from '../lib/describe';

export function NotificationsScreen() {
  const signedIn = useIsSignedIn();
  if (!signedIn)
    return (
      <Screen edges={['top', 'left', 'right']}>
        <Text variant="title">Avisos</Text>
        <SignedOut
          title="Entre para ver seus avisos"
          body="Avisamos aqui quando um agendamento seu muda, e na hora do lembrete."
          back="/avisos"
        />
      </Screen>
    );
  return <Notifications />;
}

function Notifications() {
  const list = useNotifications();
  const me = useMe();
  return (
    <Screen
      edges={['top', 'left', 'right']}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <Text variant="title">Avisos</Text>
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title="Nenhum aviso por enquanto"
          body="Avisamos aqui quando um agendamento seu muda, e na hora do lembrete."
        />
      ) : (
        <View>
          {list.data.map((n) => (
            <NotificationRow key={n.id} notification={n} myUserId={me.data?.id} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NotificationRow({
  notification: n,
  myUserId,
}: {
  notification: Notification;
  myUserId: string | undefined;
}) {
  const router = useRouter();
  const markRead = useMarkRead();
  const now = useNow(60_000);
  const { title, body } = describeNotification(n, myUserId);
  const when = formatRelative(n.createdAt, new Date(now));

  const open = () => {
    if (!n.read) markRead.mutate(n.id);
    if (n.appointment) router.push(`/agendamento/${n.appointment.id}`);
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={[n.read ? null : 'Não lido', title, body, when]
        .filter(Boolean)
        .join(', ')}
      onPress={open}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.dot, !n.read && styles.unread]} />
      <View style={styles.body}>
        <Text variant="label">{title}</Text>
        <Text variant="muted">{body}</Text>
        <Text variant="muted" style={styles.when}>
          {when}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: hairline,
    borderBottomColor: colors.line,
  },
  pressed: { opacity: 0.7 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  unread: { backgroundColor: colors.accent },
  body: { flex: 1, gap: 2 },
  when: { fontSize: 13 },
});
