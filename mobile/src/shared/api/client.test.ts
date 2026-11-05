import { TypedDocumentString } from '@/gql/graphql';
import { fakeApi, gqlError } from '@/test/fake-api';
import { createApiClient } from './client';
import { createSessionStore, type KeyValueStorage, type Session } from './session';

const MeQuery = new TypedDocumentString<{ me: { id: string; name: string } }, never>(
  'query ClientTestMe { me { id name } }',
);

const session = (token: string): Session => ({
  accessToken: token,
  accessTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
  refreshToken: `r-${token}`,
});

const noStorage: KeyValueStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

function setup(handlers: Parameters<typeof fakeApi>[0], stored: Session | null = session('t1')) {
  const server = fakeApi(handlers);
  const refresh = jest.fn(async () => session('t2'));
  const store = createSessionStore({ storage: noStorage, refresh });
  if (stored) store.set(stored);
  const client = createApiClient({
    session: store,
    baseUrl: 'http://api.test',
    fetch: server.fetch,
    timeoutMs: 50,
  });
  return { client, store, refresh, server };
}

const ana = { me: { id: 'u1', name: 'Ana' } };

describe('api client', () => {
  it('sends the bearer token and returns data', async () => {
    const { client, server } = setup({ ClientTestMe: () => ana });
    await expect(client.request(MeQuery)).resolves.toEqual(ana);
    expect(server.calls[0]?.authorization).toBe('Bearer t1');
  });

  it('sends no authorization when signed out', async () => {
    const { client, server } = setup({ ClientTestMe: () => ana }, null);
    await client.request(MeQuery);
    expect(server.calls[0]?.authorization).toBeNull();
  });

  it('turns a GraphQL error into an ApiError with its code', async () => {
    const { client } = setup({ ClientTestMe: () => gqlError('SHOP_NOT_FOUND', 'No shop.') });
    await expect(client.request(MeQuery)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'SHOP_NOT_FOUND',
      message: 'No shop.',
    });
  });

  it('reports NETWORK_ERROR when the request fails or the server breaks', async () => {
    const failing = setup({
      ClientTestMe: () => {
        throw new TypeError('Network request failed');
      },
    });
    await expect(failing.client.request(MeQuery)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    const broken = setup({ ClientTestMe: () => new Response('Bad gateway', { status: 502 }) });
    await expect(broken.client.request(MeQuery)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('gives up with TIMEOUT when the API does not answer in time', async () => {
    const { client } = setup({ ClientTestMe: () => new Promise(() => {}) });
    await expect(client.request(MeQuery)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('refreshes once and retries when the API says UNAUTHENTICATED', async () => {
    const { client, refresh, server } = setup({
      ClientTestMe: (_v, { authorization }) =>
        authorization === 'Bearer t2' ? ana : gqlError('UNAUTHENTICATED'),
    });
    await expect(client.request(MeQuery)).resolves.toEqual(ana);
    expect(server.calls.map((c) => c.authorization)).toEqual(['Bearer t1', 'Bearer t2']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('signs out when the retry is rejected too', async () => {
    const { client, store } = setup({ ClientTestMe: () => gqlError('UNAUTHENTICATED') });
    await expect(client.request(MeQuery)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(store.get()).toBeNull();
  });
});
