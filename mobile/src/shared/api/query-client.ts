import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { isApiError } from './errors';

/**
 * Domain errors (SLOT_UNAVAILABLE, SHOP_NOT_FOUND, ...) are answers, not glitches: retrying them
 * only delays the message. Network failures and timeouts get two more tries.
 */
export function createQueryClient({ retries = 2 }: { retries?: number } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) =>
          (isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT')) && count < retries,
      },
      mutations: { retry: false },
    },
  });
}

/** Queries refetch when the app comes back to the foreground, as a browser tab does on focus. */
export function refetchOnForeground(): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
  return () => subscription.remove();
}
