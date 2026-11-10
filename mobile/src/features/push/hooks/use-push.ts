import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { useApi } from '@/shared/api';
import { onSignOut } from '@/shared/lib/sign-out-tasks';
import { registerPushToken, unregisterPushToken } from '../api/push';
import { usePushDevice } from '../lib/push-device';

const permissionKey = ['push', 'permission'] as const;

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

/**
 * While signed in and allowed: registers this phone's token (on every start, which also tells
 * the server it is still in use), and unregisters it right before signing out.
 */
export function usePushRegistration() {
  const api = useApi();
  const device = usePushDevice();
  const signedIn = useIsSignedIn();
  const permission = usePushPermission();
  const granted = permission.data === 'granted';

  const token = useQuery({
    queryKey: ['push', 'registered'],
    queryFn: async () => {
      const value = await device.token();
      await registerPushToken(api, value, device.platform);
      return value;
    },
    enabled: device.supported && signedIn && granted,
    staleTime: Infinity,
    retry: false,
  });

  const registered = token.data;
  useEffect(() => {
    if (!registered) return;
    return onSignOut(() => unregisterPushToken(api, registered));
  }, [api, registered]);
}

/** The "Ativar avisos" button: asks, then registers right away when the answer is yes. */
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
