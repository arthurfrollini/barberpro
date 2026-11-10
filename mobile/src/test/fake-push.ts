import type { PushDevice, PushPermission, PushTap } from '@/features/push/lib/push-device';

/** A phone's notification system, scripted by the test. */
export function fakePush(
  options: {
    permission?: PushPermission;
    /** What the system prompt answers. */
    answer?: PushPermission;
    token?: () => Promise<string>;
    lastTap?: PushTap | null;
    /** What this phone kept from earlier runs (a token still to unregister, a dismissed card). */
    stored?: Record<string, string>;
  } = {},
) {
  let permission: PushPermission = options.permission ?? 'undetermined';
  let lastTap = options.lastTap ?? null;
  const receivers = new Set<() => void>();
  const tappers = new Set<(tap: PushTap) => void>();
  const calls = { request: 0, settings: 0, clearLastTap: 0, badges: [] as number[] };
  const stored = new Map<string, string>(Object.entries(options.stored ?? {}));

  const device: PushDevice = {
    supported: true,
    platform: 'IOS',
    permission: async () => permission,
    request: async () => {
      calls.request += 1;
      permission = options.answer ?? 'granted';
      return permission;
    },
    token: options.token ?? (async () => 'ExpoPushToken[test-phone]'),
    onReceive: (listener) => {
      receivers.add(listener);
      return () => receivers.delete(listener);
    },
    onTap: (listener) => {
      tappers.add(listener);
      return () => tappers.delete(listener);
    },
    lastTap: async () => lastTap,
    clearLastTap: () => {
      calls.clearLastTap += 1;
      lastTap = null;
    },
    openSettings: () => {
      calls.settings += 1;
    },
    setBadge: async (count) => {
      calls.badges.push(count);
    },
    store: {
      getItem: async (key) => stored.get(key) ?? null,
      setItem: async (key, value) => void stored.set(key, value),
      removeItem: async (key) => void stored.delete(key),
    },
  };

  return {
    device,
    calls,
    stored,
    /** A push arrives while the app is open. */
    receive: () => receivers.forEach((listener) => listener()),
    /** The user taps a push. */
    tap: (tap: PushTap) => tappers.forEach((listener) => listener(tap)),
  };
}
