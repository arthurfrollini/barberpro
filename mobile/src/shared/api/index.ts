import { createApiClient, postGraphQL, REQUEST_TIMEOUT_MS, unwrap } from './client';
import { RefreshTokenMutation } from './refresh';
import { createSessionStore } from './session';
import { deviceStorage } from './storage';

export { ApiError, isApiError } from './errors';
export type { ApiClient } from './client';
export type { Session, SessionStore } from './session';
export { ApiProvider, useApi, useSession, useSessionStore } from './provider';
export { createQueryClient, refetchOnForeground } from './query-client';

/** The API. The iOS simulator and the web build reach the host's localhost; see .env.example. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const session = createSessionStore({
  storage: deviceStorage,
  refresh: async (token) =>
    unwrap(
      await postGraphQL(
        { baseUrl: API_URL, fetch: (...args) => fetch(...args), timeoutMs: REQUEST_TIMEOUT_MS },
        RefreshTokenMutation,
        { token },
        null,
      ),
    ).refreshToken,
});

export const api = createApiClient({ session, baseUrl: API_URL });
