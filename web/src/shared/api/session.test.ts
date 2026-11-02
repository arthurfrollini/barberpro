import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import { SESSION_KEY, createSessionStore, type Session } from './session';

const NOW = Date.parse('2026-11-02T12:00:00Z');
const session = (token: string, expiresInSeconds: number): Session => ({
  accessToken: token,
  accessTokenExpiresAt: new Date(NOW + expiresInSeconds * 1000).toISOString(),
  refreshToken: `refresh-of-${token}`,
});

function setup(
  options: { stored?: Session; lock?: Parameters<typeof createSessionStore>[0]['lock'] } = {},
) {
  if (options.stored) localStorage.setItem(SESSION_KEY, JSON.stringify(options.stored));
  const refresh = vi.fn(async (refreshToken: string) => session(`new-${refreshToken}`, 900));
  const store = createSessionStore({
    storage: localStorage,
    refresh,
    now: () => NOW,
    ...(options.lock ? { lock: options.lock } : {}),
  });
  return { store, refresh };
}

describe('session store', () => {
  it('returns null when signed out', async () => {
    const { store, refresh } = setup();
    expect(store.get()).toBeNull();
    expect(await store.accessToken()).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns a token that is still valid without refreshing', async () => {
    const { store, refresh } = setup({ stored: session('a', 300) });
    expect(await store.accessToken()).toBe('a');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes a token that expires within 30 seconds and stores the result', async () => {
    const { store, refresh } = setup({ stored: session('a', 20) });
    expect(await store.accessToken()).toBe('new-refresh-of-a');
    expect(refresh).toHaveBeenCalledWith('refresh-of-a');
    expect(store.get()?.accessToken).toBe('new-refresh-of-a');
  });

  it('shares one refresh between concurrent callers', async () => {
    const { store, refresh } = setup({ stored: session('a', 0) });
    const tokens = await Promise.all([store.accessToken(), store.accessToken()]);
    expect(tokens).toEqual(['new-refresh-of-a', 'new-refresh-of-a']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('uses the session another tab stored while this one waited for the lock', async () => {
    const { store, refresh } = setup({
      stored: session('a', 0),
      lock: async (_name, work) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session('from-other-tab', 900)));
        return work();
      },
    });
    expect(await store.accessToken()).toBe('from-other-tab');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('force refreshes a token the API rejected, unless another tab already replaced it', async () => {
    const { store, refresh } = setup({ stored: session('a', 300) });
    expect(await store.accessToken({ force: true })).toBe('new-refresh-of-a');
    expect(refresh).toHaveBeenCalledTimes(1);

    const other = setup({
      stored: session('b', 300),
      lock: async (_name, work) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session('from-other-tab', 900)));
        return work();
      },
    });
    expect(await other.store.accessToken({ force: true })).toBe('from-other-tab');
    expect(other.refresh).not.toHaveBeenCalled();
  });

  it('clears the session when the refresh token is rejected', async () => {
    const { store, refresh } = setup({ stored: session('a', 0) });
    refresh.mockRejectedValueOnce(new ApiError('INVALID_REFRESH_TOKEN', 'nope'));
    expect(await store.accessToken()).toBeNull();
    expect(store.get()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('keeps the session when the refresh fails on the network', async () => {
    const { store, refresh } = setup({ stored: session('a', 0) });
    refresh.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'offline'));
    await expect(store.accessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(store.get()?.accessToken).toBe('a');
  });

  it('ignores a corrupted stored value', () => {
    localStorage.setItem(SESSION_KEY, '{not json');
    const { store } = setup();
    expect(store.get()).toBeNull();
  });

  it('notifies subscribers on set, clear and changes from other tabs', () => {
    const { store } = setup();
    const seen: (string | null)[] = [];
    const unsubscribe = store.subscribe((s) => seen.push(s?.accessToken ?? null));
    store.set(session('a', 900));
    store.clear();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session('b', 900)));
    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    unsubscribe();
    store.clear();
    expect(seen).toEqual(['a', null, 'b']);
  });

  it('remembers whether the last sign-out was on purpose', async () => {
    const { store, refresh } = setup({ stored: session('a', 0) });
    expect(store.signedOutOnPurpose()).toBe(false);
    refresh.mockRejectedValueOnce(new ApiError('INVALID_REFRESH_TOKEN', 'nope'));
    await store.accessToken();
    expect(store.signedOutOnPurpose()).toBe(false);
    store.set(session('b', 900));
    store.clear({ onPurpose: true });
    expect(store.signedOutOnPurpose()).toBe(true);
    store.set(session('c', 900));
    expect(store.signedOutOnPurpose()).toBe(false);
    // another tab signing out counts as on purpose
    localStorage.removeItem(SESSION_KEY);
    const stop = store.subscribe(() => {});
    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY }));
    stop();
    expect(store.signedOutOnPurpose()).toBe(true);
  });

  it('does not bring back a session that was signed out while its refresh was running', async () => {
    const { store, refresh } = setup({ stored: session('a', 0) });
    refresh.mockImplementationOnce(async () => {
      localStorage.removeItem(SESSION_KEY); // another tab signs out meanwhile
      return session('late', 900);
    });
    expect(await store.accessToken()).toBeNull();
    expect(store.get()).toBeNull();
  });
});
