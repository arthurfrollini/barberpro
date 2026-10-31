import { isApiError } from './errors';

export type Session = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };

export type SessionStore = ReturnType<typeof createSessionStore>;

type Lock = <T>(name: string, work: () => Promise<T>) => Promise<T>;

export const SESSION_KEY = 'barberpro.session';
const LOCK_NAME = 'barberpro-refresh';
const MARGIN_MS = 30_000;

/** Web Locks serialize the refresh across tabs; without them (old browsers, jsdom) it runs as is. */
const browserLock: Lock = (name, work) =>
  typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(name, work)
    : work();

/**
 * The signed-in session, kept in localStorage so every tab shares it. Refresh tokens are single
 * use and the API treats a reused one as stolen, revoking the whole session: so only one tab
 * refreshes at a time (a Web Lock), and each re-reads storage inside the lock in case another
 * tab already did it.
 */
export function createSessionStore(options: {
  storage: Storage;
  refresh: (refreshToken: string) => Promise<Session>;
  lock?: Lock;
  now?: () => number;
}) {
  const { storage, refresh, lock = browserLock, now = Date.now } = options;
  const listeners = new Set<(session: Session | null) => void>();
  let inflight: Promise<string | null> | null = null;
  // whether the session ended because someone signed out (here or in another tab), as
  // opposed to expiring: an interrupted user is sent back to their page after signing in
  let onPurpose = false;

  const read = (): Session | null => {
    try {
      const value = JSON.parse(storage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null;
      return value?.accessToken && value.refreshToken && value.accessTokenExpiresAt
        ? (value as Session)
        : null;
    } catch {
      return null;
    }
  };
  const notify = () => {
    const session = read();
    for (const listener of listeners) listener(session);
  };
  const fresh = (session: Session) => Date.parse(session.accessTokenExpiresAt) - now() > MARGIN_MS;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_KEY && event.key !== null) return;
    onPurpose = read() === null;
    notify();
  };

  const store = {
    get: read,
    set(session: Session) {
      onPurpose = false;
      storage.setItem(SESSION_KEY, JSON.stringify(session));
      notify();
    },
    clear({ onPurpose: deliberate = false }: { onPurpose?: boolean } = {}) {
      onPurpose = deliberate;
      storage.removeItem(SESSION_KEY);
      notify();
    },
    signedOutOnPurpose: () => onPurpose,
    subscribe(listener: (session: Session | null) => void) {
      if (listeners.size === 0) window.addEventListener('storage', onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
      };
    },
    /**
     * A usable access token, refreshing it first when it expires within 30 seconds. `force`
     * refreshes even then (the API just rejected it). Null means signed out.
     */
    async accessToken({ force = false }: { force?: boolean } = {}): Promise<string | null> {
      const current = read();
      if (!current) return null;
      if (!force && fresh(current)) return current.accessToken;
      inflight ??= lock(LOCK_NAME, async () => {
        const latest = read();
        if (!latest) return null;
        const replaced = latest.accessToken !== current.accessToken;
        if (fresh(latest) && (replaced || !force)) return latest.accessToken;
        try {
          const next = await refresh(latest.refreshToken);
          store.set(next);
          return next.accessToken;
        } catch (error) {
          // offline is not signed out: keep the session for the next try
          if (isApiError(error, 'NETWORK_ERROR')) throw error;
          store.clear();
          return null;
        }
      }).finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
  return store;
}
