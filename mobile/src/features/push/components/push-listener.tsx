import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { safeReturnPath } from '@/features/auth/lib/return-path';
import { usePushRegistration } from '../hooks/use-push';
import { usePushDevice, type PushTap } from '../lib/push-device';

/**
 * Mounted once, under the providers: keeps this phone registered, refreshes what a push
 * changed, and opens the app where a tapped push points, also when the tap started the app.
 */
export function PushListener() {
  usePushRegistration();
  const device = usePushDevice();
  const router = useRouter();
  const queryClient = useQueryClient();
  // a cold-start tap can reach both lastTap and the listener: open it once
  const opened = useRef(new Set<string>());

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };
    const open = (tap: PushTap) => {
      if (opened.current.has(tap.id)) return;
      opened.current.add(tap.id);
      refresh();
      // only paths inside the app, whatever the payload says
      const path = safeReturnPath(tap.url);
      if (path) router.push(path as Href);
    };

    const offReceive = device.onReceive(refresh);
    const offTap = device.onTap(open);
    void device.lastTap().then((tap) => {
      if (!tap) return;
      device.clearLastTap();
      open(tap);
    });
    return () => {
      offReceive();
      offTap();
    };
  }, [device, queryClient, router]);

  return null;
}
