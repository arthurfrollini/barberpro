import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { ApiClient } from './client';
import type { Session, SessionStore } from './session';

type ApiContextValue = { api: ApiClient; session: SessionStore };

const ApiContext = createContext<ApiContextValue | null>(null);

/**
 * The API client, the session and the query cache for the tree. Tests pass a client built on
 * a fake fetch. Signing out (or a session that expired) empties the cache, so the next person
 * never sees the last one's appointments.
 */
export function ApiProvider({
  api,
  session,
  queryClient,
  children,
}: ApiContextValue & { queryClient: QueryClient; children: ReactNode }) {
  useEffect(
    () =>
      session.subscribe((next) => {
        if (!next) queryClient.clear();
      }),
    [session, queryClient],
  );
  return (
    <ApiContext value={{ api, session }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiContext>
  );
}

function useApiContext(): ApiContextValue {
  const value = use(ApiContext);
  if (!value) throw new Error('ApiProvider is missing');
  return value;
}

/** For request functions' hooks only. */
export const useApi = (): ApiClient => useApiContext().api;

export const useSessionStore = (): SessionStore => useApiContext().session;

/** The current session, re-rendering on sign in and sign out. */
export function useSession(): Session | null {
  const store = useSessionStore();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
