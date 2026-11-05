import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import { colors, fonts } from '@/shared/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );

export default function TabsLayout() {
  const unread = useUnreadCount();
  const badge = unread.data ? (unread.data > 9 ? '9+' : unread.data) : undefined;
  return (
    <Tabs
      screenOptions={{
        // each tab draws its own large title under the status bar
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bar, borderTopColor: colors.bar },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium },
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Explorar', tabBarIcon: icon('compass-outline') }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{ title: 'Agendamentos', tabBarIcon: icon('calendar-outline') }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: icon('notifications-outline'),
          tabBarBadge: badge,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent },
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{ title: 'Conta', tabBarIcon: icon('person-circle-outline') }}
      />
    </Tabs>
  );
}
