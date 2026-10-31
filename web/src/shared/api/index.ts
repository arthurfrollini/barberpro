import { createApiClient, postGraphQL, unwrap } from './client';
import { RefreshTokenMutation } from './refresh';
import { createSessionStore } from './session';

export { ApiError, isApiError } from './errors';
export type { Session } from './session';

let sessionExpired = () => {};

/** The app registers what to do when the API stops accepting the session (clear caches). */
export function onSessionExpired(handler: () => void) {
  sessionExpired = handler;
}

export const session = createSessionStore({
  storage: window.localStorage,
  refresh: async (token) =>
    unwrap(
      await postGraphQL(
        { baseUrl: window.location.origin, fetch: (...args) => fetch(...args) },
        RefreshTokenMutation,
        { token },
        null,
      ),
    ).refreshToken,
});

export const api = createApiClient({ session, onSessionExpired: () => sessionExpired() });
