import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { useApi, type ApiClient } from '@/shared/api';
import { registerPushToken, unregisterPushToken } from '../api/push';
import {
  CARD_DISMISSED,
  PENDING_UNREGISTER,
  usePushDevice,
  type PushDevice,
} from '../lib/push-device';

const permissionKey = ['push', 'permission'] as const;
const dismissedKey = ['push', 'dismissed'] as const;

/** Whether this phone lets the app notify; re-read when the app returns from the settings app. */
export function usePushPermission() {
  const device = usePushDevice();
  return useQuery({
    queryKey: permissionKey,
    queryFn: () => device.permission(),
    enabled: device.supported,
    staleTime: 0,
  });
}

/** Unregisters a token without a session; offline, keeps it for the next start. */
async function forget(api: ApiClient, device: PushDevice, token: string) {
  try {
    await unregisterPushToken(api, token);
    await device.store.removeItem(PENDING_UNREGISTER);
  } catch {
    await device.store.setItem(PENDING_UNREGISTER, token);
  }
}

/**
 * While signed in and allowed, registers this phone's token (on every start, which also tells
 * the server it is still in use). When the session ends, for any reason (signing out, offline
 * or not, or a session that expired), unregisters it without needing the session: only this
 * phone has the token. Offline, the token is kept and unregistered on the next start, before
 * anyone registers again.
 */
export function usePushRegistration() {
  const api = useApi();
  const device = usePushDevice();
  const signedIn = useIsSignedIn();
  const permission = usePushPermission();
  const registered = useRef<string | null>(null);
  // read inside the async registration, which can outlive the session that started it
  const signedInNow = useRef(signedIn);
  useEffect(() => {
    signedInNow.current = signedIn;
  }, [signedIn]);
  const [flushed, setFlushed] = useState(!device.supported);

  useEffect(() => {
    if (!device.supported) return;
    void (async () => {
      const pending = await device.store.getItem(PENDING_UNREGISTER).catch(() => null);
      if (pending) await forget(api, device, pending);
      setFlushed(true);
    })();
  }, [api, device]);

  useQuery({
    queryKey: ['push', 'registered'],
    queryFn: async () => {
      const value = await device.token();
      // known before the call: signing out mid-flight must still find it
      registered.current = value;
      await registerPushToken(api, value, device.platform);
      if (!signedInNow.current) {
        // the session ended while this was registering: the unregister may have run first
        registered.current = null;
        await forget(api, device, value);
      }
      return value;
    },
    enabled: device.supported && flushed && signedIn && permission.data === 'granted',
    staleTime: Infinity,
    retry: 2,
    retryDelay: 500,
  });

  useEffect(() => {
    if (signedIn || !device.supported) return;
    void device.setBadge(0);
    const value = registered.current;
    registered.current = null;
    if (value) void forget(api, device, value);
  }, [api, device, signedIn]);
}

/** The "Ativar avisos" button: asks; a yes is registered by usePushRegistration. */
export function useEnablePush() {
  const device = usePushDevice();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => device.request(),
    onSuccess: (permission) => {
      queryClient.setQueryData(permissionKey, permission);
    },
  });
}

/** "Agora não" on the card after a booking, remembered on this phone. */
export function useCardDismissed() {
  const device = usePushDevice();
  const queryClient = useQueryClient();
  const dismissed = useQuery({
    queryKey: dismissedKey,
    queryFn: async () => (await device.store.getItem(CARD_DISMISSED).catch(() => null)) === '1',
    enabled: device.supported,
    staleTime: Infinity,
  });
  const dismiss = () => {
    // a read still in flight would answer "not dismissed" over this
    void queryClient.cancelQueries({ queryKey: dismissedKey });
    queryClient.setQueryData(dismissedKey, true);
    void device.store.setItem(CARD_DISMISSED, '1').catch(() => undefined);
  };
  return { dismissed: dismissed.data, dismiss };
}
