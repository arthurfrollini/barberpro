import { createApiClient, postGraphQL, REQUEST_TIMEOUT_MS, unwrap } from './client';
import { RefreshTokenMutation } from './refresh';
import { createSessionStore } from './session';

export { ApiError, isApiError } from './errors';
export type { Session } from './session';

export const session = createSessionStore({
  storage: window.localStorage,
  refresh: async (token) =>
    unwrap(
      await postGraphQL(
        {
          baseUrl: window.location.origin,
          fetch: (...args) => fetch(...args),
          timeoutMs: REQUEST_TIMEOUT_MS,
        },
        RefreshTokenMutation,
        { token },
        null,
      ),
    ).refreshToken,
});

// when the session ends, the app's providers clear the cache and the guards go to sign in
export const api = createApiClient({ session });
