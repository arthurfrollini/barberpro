import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { createContext, use, type ReactNode } from 'react';
import { Linking, Platform } from 'react-native';
import type { KeyValueStorage } from '@/shared/api/session';
import { deviceStorage } from '@/shared/api/storage';

export type PushPermission = 'granted' | 'denied' | 'undetermined';

/** A notification the user tapped; `url` is the app path the server put in its data. */
export type PushTap = { id: string; url: string | null };

/**
 * The phone's notification system. The real one wraps expo-notifications, which needs a
 * development build; tests pass a scripted one, as with location.
 */
export type PushDevice = {
  supported: boolean;
  platform: 'IOS' | 'ANDROID';
  permission(): Promise<PushPermission>;
  /** Shows the system prompt (once; after a no, the answer is the settings app's). */
  request(): Promise<PushPermission>;
  /** The Expo push token; throws without network or a project id. */
  token(): Promise<string>;
  onReceive(listener: () => void): () => void;
  onTap(listener: (tap: PushTap) => void): () => void;
  /** The tap that opened the app from closed, if any. */
  lastTap(): Promise<PushTap | null>;
  clearLastTap(): void;
  openSettings(): void;
  /** The number on the app icon. */
  setBadge(count: number): Promise<void>;
  /** What the app keeps on this phone between runs. */
  store: KeyValueStorage;
};

/** A token whose unregister failed (signed out offline): retried on the next start. */
export const PENDING_UNREGISTER = 'barberpro.push.pending';
/** The user answered "Agora não" to the card after a booking. */
export const CARD_DISMISSED = 'barberpro.push.dismissed';

const toPermission = (status: Notifications.NotificationPermissionsStatus): PushPermission =>
  status.granted ? 'granted' : status.canAskAgain ? 'undetermined' : 'denied';

const toTap = (response: Notifications.NotificationResponse): PushTap => {
  const url = response.notification.request.content.data?.url;
  return {
    id: response.notification.request.identifier,
    url: typeof url === 'string' ? url : null,
  };
};

const native = Platform.OS === 'ios' || Platform.OS === 'android';

/** Once, from the root layout: in the foreground, show the banner too. */
export function showNotificationsInForeground() {
  if (!native) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const devicePush: PushDevice = {
  supported: native,
  platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
  permission: async () => toPermission(await Notifications.getPermissionsAsync()),
  request: async () => toPermission(await Notifications.requestPermissionsAsync()),
  async token() {
    if (Platform.OS === 'android') {
      // Android needs a channel before it hands out a token
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  },
  onReceive(listener) {
    const subscription = Notifications.addNotificationReceivedListener(() => listener());
    return () => subscription.remove();
  },
  onTap(listener) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      listener(toTap(response)),
    );
    return () => subscription.remove();
  },
  lastTap: async () => {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response ? toTap(response) : null;
  },
  clearLastTap: () => Notifications.clearLastNotificationResponse(),
  openSettings: () => void Linking.openSettings(),
  setBadge: async (count) => {
    await Notifications.setBadgeCountAsync(count);
  },
  store: deviceStorage,
};

/** For the web build and anything without notifications. */
export const noPush: PushDevice = {
  supported: false,
  platform: 'IOS',
  permission: async () => 'denied',
  request: async () => 'denied',
  token: async () => {
    throw new Error('push is not supported here');
  },
  onReceive: () => () => {},
  onTap: () => () => {},
  lastTap: async () => null,
  clearLastTap: () => {},
  openSettings: () => {},
  setBadge: async () => {},
  store: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
};

const PushContext = createContext<PushDevice>(devicePush);

export function PushProvider({ device, children }: { device: PushDevice; children: ReactNode }) {
  return <PushContext value={device}>{children}</PushContext>;
}

export const usePushDevice = () => use(PushContext);
