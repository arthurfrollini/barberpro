import { isApiError } from './errors';

export type Session = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };

/** The async key-value shape both SecureStore and a wrapped localStorage fit. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SessionStore = ReturnType<typeof createSessionStore>;

export const SESSION_KEY = 'barberpro.session';
const MARGIN_MS = 30_000;

const parse = (raw: string | null): Session | null => {
  try {
    const value = JSON.parse(raw ?? 'null') as Partial<Session> | null;
    return value?.accessToken && value.refreshToken && value.accessTokenExpiresAt
      ? (value as Session)
      : null;
  } catch {
    return null;
  }
};

/**
 * The signed-in session. Storage is async on a phone (Keychain, Keystore), so the session is
 * read once at start-up (`hydrate`, while the splash screen is up) and kept in memory; writes
 * go through to storage. Refresh tokens are single use and the API treats a reused one as
 * stolen, so concurrent callers share one in-flight refresh.
 */
export function createSessionStore(options: {
  storage: KeyValueStorage;
  refresh: (refreshToken: string) => Promise<Session>;
  now?: () => number;
}) {
  // read the clock at call time, so a faked clock (tests) is the one used
  const { storage, refresh, now = () => Date.now() } = options;
  const listeners = new Set<(session: Session | null) => void>();
  let current: Session | null = null;
  let inflight: Promise<string | null> | null = null;

  const notify = () => {
    for (const listener of listeners) listener(current);
  };
  const fresh = (session: Session) => Date.parse(session.accessTokenExpiresAt) - now() > MARGIN_MS;
  // a failed write leaves the in-memory session working; the next start just signs in again
  const persist = (work: Promise<void>) => work.catch(() => undefined);

  const store = {
    async hydrate() {
      current = parse(await storage.getItem(SESSION_KEY).catch(() => null));
    },
    get: () => current,
    set(session: Session) {
      current = session;
      void persist(storage.setItem(SESSION_KEY, JSON.stringify(session)));
      notify();
    },
    clear() {
      current = null;
      void persist(storage.removeItem(SESSION_KEY));
      notify();
    },
    subscribe(listener: (session: Session | null) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * A usable access token, refreshing it first when it expires within 30 seconds. `force`
     * refreshes even then (the API just rejected it). Null means signed out.
     */
    async accessToken({ force = false }: { force?: boolean } = {}): Promise<string | null> {
      const start = current;
      if (!start) return null;
      if (!force && fresh(start)) return start.accessToken;
      inflight ??= (async () => {
        try {
          const next = await refresh(start.refreshToken);
          // signed out (or in as someone else) while this waited: the new tokens belong to a
          // session that no longer exists here
          if (current?.refreshToken !== start.refreshToken) return current?.accessToken ?? null;
          store.set(next);
          return next.accessToken;
        } catch (error) {
          // offline is not signed out: keep the session for the next try. Any other failure
          // ends it: retrying an old refresh token would look like reuse and revoke every
          // session of the user.
          if (isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT')) throw error;
          if (current?.refreshToken === start.refreshToken) store.clear();
          return null;
        }
      })().finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
  return store;
}
