import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './errors';

/**
 * Domain errors (NOT_A_BARBER, SLOT_UNAVAILABLE, ...) are answers, not glitches: retrying them
 * only delays the message. Network failures get two more tries.
 */
export function createQueryClient({ retries = 2 }: { retries?: number } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => isApiError(error, 'NETWORK_ERROR') && count < retries,
      },
      mutations: { retry: false },
    },
  });
}
