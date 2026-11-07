import { render } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { createApiClient } from '@/shared/api/client';
import { ApiProvider } from '@/shared/api/provider';
import { createQueryClient } from '@/shared/api/query-client';
import { createSessionStore, type KeyValueStorage, type Session } from '@/shared/api/session';
import { fakeApi, type FakeApi, type FakeHandler } from './fake-api';

export const TEST_SESSION: Session = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2999-01-01T00:00:00.000Z',
  refreshToken: 'refresh-1',
};

const memory = (): KeyValueStorage => {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
  };
};

type Options = {
  handlers?: Record<string, FakeHandler>;
  /** Start signed in (the default) or signed out. */
  signedIn?: boolean;
};

/** The real client, session store and query cache over a fake API. */
export function createTestApp({ handlers = {}, signedIn = true }: Options = {}) {
  const server: FakeApi = fakeApi(handlers);
  const session = createSessionStore({
    storage: memory(),
    refresh: async () => {
      throw new Error('refresh not expected in this test');
    },
  });
  if (signedIn) session.set(TEST_SESSION);
  const api = createApiClient({ session, baseUrl: 'http://api.test', fetch: server.fetch });
  const queryClient = createQueryClient({ retries: 0 });
  // no garbage-collection timers: they would outlive the test and hold the Jest worker
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, gcTime: Infinity },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider api={api} session={session} queryClient={queryClient}>
      {children}
    </ApiProvider>
  );
  return { server, session, api, queryClient, Wrapper };
}

export async function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const app = createTestApp(options);
  const view = await render(ui, { wrapper: app.Wrapper });
  return { ...app, view };
}

/** Routes as Expo Router sees them (`'barbearia/[id]'`, `'(tabs)/_layout'`), inside the providers. */
export async function renderAppRouter(
  routes: Record<string, ComponentType<object>>,
  { initialUrl = '/', ...options }: Options & { initialUrl?: string } = {},
) {
  const app = createTestApp(options);
  const view = await renderRouter(routes, { initialUrl, wrapper: app.Wrapper });
  return { ...app, view };
}
