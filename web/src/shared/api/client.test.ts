import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { TypedDocumentString } from '@/gql/graphql';
import { api, gqlData, gqlError } from '@/test/graphql';
import { server } from '@/test/server';
import { createApiClient } from './client';
import { createSessionStore, SESSION_KEY, type Session } from './session';

const MeQuery = new TypedDocumentString<{ me: { id: string; name: string } }, never>(
  'query ClientTestMe { me { id name } }',
);

const session = (token: string): Session => ({
  accessToken: token,
  accessTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
  refreshToken: `r-${token}`,
});

function setup(stored: Session | null = session('t1')) {
  if (stored) localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  const refresh = vi.fn(async () => session('t2'));
  const store = createSessionStore({ storage: localStorage, refresh });
  const onSessionExpired = vi.fn();
  const client = createApiClient({ session: store, onSessionExpired });
  return { client, store, refresh, onSessionExpired };
}

describe('api client', () => {
  it('sends the bearer token and returns data', async () => {
    let authorization: string | null = null;
    server.use(
      api.query('ClientTestMe', ({ request }) => {
        authorization = request.headers.get('authorization');
        return gqlData({ me: { id: 'u1', name: 'Ana' } });
      }),
    );
    const { client } = setup();
    await expect(client.request(MeQuery)).resolves.toEqual({ me: { id: 'u1', name: 'Ana' } });
    expect(authorization).toBe('Bearer t1');
  });

  it('sends no authorization when signed out', async () => {
    let authorization: string | null = 'unset';
    server.use(
      api.query('ClientTestMe', ({ request }) => {
        authorization = request.headers.get('authorization');
        return gqlData({ me: { id: 'u1', name: 'Ana' } });
      }),
    );
    const { client } = setup(null);
    await client.request(MeQuery);
    expect(authorization).toBeNull();
  });

  it('turns a GraphQL error into an ApiError with its code', async () => {
    server.use(api.query('ClientTestMe', () => gqlError('NOT_A_BARBER', 'Not a barber.')));
    const { client } = setup();
    await expect(client.request(MeQuery)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NOT_A_BARBER',
      message: 'Not a barber.',
    });
  });

  it('reports NETWORK_ERROR when the request fails or the server breaks', async () => {
    const { client } = setup();
    server.use(api.query('ClientTestMe', () => HttpResponse.error()));
    await expect(client.request(MeQuery)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    server.use(api.query('ClientTestMe', () => new Response('Bad gateway', { status: 502 })));
    await expect(client.request(MeQuery)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('refreshes once and retries when the API says UNAUTHENTICATED', async () => {
    const seen: (string | null)[] = [];
    server.use(
      api.query('ClientTestMe', ({ request }) => {
        const auth = request.headers.get('authorization');
        seen.push(auth);
        return auth === 'Bearer t2'
          ? gqlData({ me: { id: 'u1', name: 'Ana' } })
          : gqlError('UNAUTHENTICATED');
      }),
    );
    const { client, refresh, onSessionExpired } = setup();
    await expect(client.request(MeQuery)).resolves.toEqual({ me: { id: 'u1', name: 'Ana' } });
    expect(seen).toEqual(['Bearer t1', 'Bearer t2']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out when the retry is rejected too', async () => {
    server.use(api.query('ClientTestMe', () => gqlError('UNAUTHENTICATED')));
    const { client, store, onSessionExpired } = setup();
    await expect(client.request(MeQuery)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(store.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('uploads a file with the token and returns its id', async () => {
    let authorization: string | null = null;
    server.use(
      // the multipart body itself is covered end to end; jsdom's File cannot be re-read here
      http.post('*/uploads', ({ request }) => {
        authorization = request.headers.get('authorization');
        expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
        return HttpResponse.json({ id: 'f1', url: 'http://x/files/f1' }, { status: 201 });
      }),
    );
    const { client } = setup();
    await expect(client.upload(new File(['x'], 'a.png', { type: 'image/png' }))).resolves.toEqual({
      id: 'f1',
      url: 'http://x/files/f1',
    });
    expect(authorization).toBe('Bearer t1');
  });

  it('maps upload errors to their code', async () => {
    server.use(
      http.post('*/uploads', () =>
        HttpResponse.json({ code: 'FILE_TOO_LARGE', message: 'big' }, { status: 413 }),
      ),
    );
    const { client } = setup();
    await expect(client.upload(new File(['x'], 'a.png'))).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
    });
  });
});
