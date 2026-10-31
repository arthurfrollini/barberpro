import { createClient, type Client } from 'graphql-sse';
import type { TypedDocumentString } from '@/gql/graphql';
import { session } from './index';

let client: Client | null = null;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * GraphQL subscriptions over server-sent events, the protocol Yoga speaks ("distinct
 * connections": one HTTP stream per subscription). The token is read on every (re)connect, so
 * a stream reopened after the laptop slept carries a fresh one. Broken streams retry forever,
 * backing off up to 30 seconds.
 */
function sse(): Client {
  client ??= createClient({
    url: `${window.location.origin}/graphql`,
    headers: async (): Promise<Record<string, string>> => {
      const token = await session.accessToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    retryAttempts: Infinity,
    retry: (retries) => wait(Math.min(1000 * 2 ** retries, 30_000) + Math.random() * 1000),
  });
  return client;
}

export function subscribe<R>(
  document: TypedDocumentString<R, Record<string, never>>,
  handlers: { next: (data: R) => void; reconnected?: () => void; error?: (error: unknown) => void },
): () => void {
  return sse().subscribe<R>(
    { query: document.toString() },
    {
      next: (result) => result.data && handlers.next(result.data),
      error: (error) => handlers.error?.(error),
      complete: () => {},
    },
    { connected: (reconnected) => reconnected && handlers.reconnected?.() },
  );
}
