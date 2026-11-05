import { ApiError } from './errors';
import { createSessionStore, SESSION_KEY, type KeyValueStorage, type Session } from './session';

const NOW = Date.parse('2026-11-05T12:00:00.000Z');
const inMinutes = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
    removeItem: async (key) => {
      delete data[key];
    },
  };
}

const session = (accessToken: string, minutes: number): Session => ({
  accessToken,
  accessTokenExpiresAt: inMinutes(minutes),
  refreshToken: `refresh-${accessToken}`,
});

async function storeWith(current: Session | null, refresh = jest.fn()) {
  const storage = memoryStorage(current ? { [SESSION_KEY]: JSON.stringify(current) } : {});
  const store = createSessionStore({ storage, refresh, now: () => NOW });
  await store.hydrate();
  return { store, storage, refresh };
}

describe('session store', () => {
  it('starts signed out and reads the stored session on hydrate', async () => {
    const { store } = await storeWith(session('a', 10));
    expect(store.get()?.accessToken).toBe('a');
    expect((await storeWith(null)).store.get()).toBeNull();
  });

  it('ignores a stored value that is not a session', async () => {
    const storage = memoryStorage({ [SESSION_KEY]: '{"accessToken":1' });
    const store = createSessionStore({ storage, refresh: jest.fn(), now: () => NOW });
    await store.hydrate();
    expect(store.get()).toBeNull();
  });

  it('returns a fresh token without refreshing', async () => {
    const { store, refresh } = await storeWith(session('a', 10));
    await expect(store.accessToken()).resolves.toBe('a');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes once for concurrent calls when the token expires within 30 seconds', async () => {
    const refresh = jest.fn(async () => session('b', 15));
    const { store, storage } = await storeWith(session('a', 0.25), refresh);
    const tokens = await Promise.all([store.accessToken(), store.accessToken()]);
    expect(tokens).toEqual(['b', 'b']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('refresh-a');
    expect(JSON.parse(storage.data[SESSION_KEY]!).accessToken).toBe('b');
  });

  it('force refreshes a token the API rejected', async () => {
    const refresh = jest.fn(async () => session('b', 15));
    const { store } = await storeWith(session('a', 10), refresh);
    await expect(store.accessToken({ force: true })).resolves.toBe('b');
  });

  it('keeps the session when the refresh fails for lack of network', async () => {
    const refresh = jest.fn(async () => {
      throw new ApiError('NETWORK_ERROR', 'offline');
    });
    const { store } = await storeWith(session('a', 0), refresh);
    await expect(store.accessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(store.get()?.accessToken).toBe('a');
  });

  it('signs out when the refresh token is rejected', async () => {
    const refresh = jest.fn(async () => {
      throw new ApiError('INVALID_REFRESH_TOKEN', 'reused');
    });
    const { store, storage } = await storeWith(session('a', 0), refresh);
    const listener = jest.fn();
    store.subscribe(listener);
    await expect(store.accessToken()).resolves.toBeNull();
    expect(store.get()).toBeNull();
    expect(storage.data[SESSION_KEY]).toBeUndefined();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('drops refreshed tokens when the user signed out while waiting', async () => {
    let finish: (s: Session) => void = () => {};
    const refresh = jest.fn(() => new Promise<Session>((resolve) => (finish = resolve)));
    const { store } = await storeWith(session('a', 0), refresh);
    const pending = store.accessToken();
    store.clear();
    finish(session('b', 15));
    await expect(pending).resolves.toBeNull();
    expect(store.get()).toBeNull();
  });
});
