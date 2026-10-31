import { createClient, type Client } from 'graphql-sse';
import type { TypedDocumentString } from '@/gql/graphql';
import { session as appSession } from './index';
import type { SessionStore } from './session';

/** The part of graphql-sse's client used here, so tests can drive a fake one. */
export type SubscriptionClient = Pick<Client<false>, 'subscribe'>;

type Handlers<R> = {
  next: (data: R) => void;
  /** A stream came back after breaking: whatever happened meanwhile was missed. */
  reconnected?: () => void;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const exponential = (attempt: number) =>
  Math.min(1000 * 2 ** attempt, 30_000) + Math.random() * 1000;

/**
 * Keeps one GraphQL subscription open for as long as the caller wants it. graphql-sse retries
 * only network failures; a stream can also end on its own (the server answers with an error,
 * such as UNAUTHENTICATED after a long sleep, and completes) or fail inside our headers (the
 * token refresh is offline). Either way this opens a new stream after a backoff, renewing the
 * token first when the API refused it, until the caller stops or the user signs out.
 */
export function createSubscriber(options: {
  client: () => SubscriptionClient;
  session: Pick<SessionStore, 'get' | 'accessToken'>;
  backoff?: (attempt: number) => number;
}) {
  const { session, backoff = exponential } = options;

  return function subscribe<R>(
    document: TypedDocumentString<R, Record<string, never>>,
    handlers: Handlers<R>,
  ): () => void {
    let stopped = false;
    let attempt = 0;
    let unauthenticated = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dispose = () => {};

    const restart = () => {
      if (stopped || !session.get()) return;
      if (unauthenticated) void session.accessToken({ force: true }).catch(() => {});
      unauthenticated = false;
      timer = setTimeout(() => open(true), backoff(attempt++));
    };

    const open = (afterBreak: boolean) => {
      if (stopped) return;
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        restart();
      };
      dispose = options.client().subscribe<R>(
        { query: document.toString() },
        {
          next: (result) => {
            const code = (result.errors?.[0]?.extensions as { code?: string } | undefined)?.code;
            if (code === 'UNAUTHENTICATED') unauthenticated = true;
            if (result.data) handlers.next(result.data);
          },
          error: end,
          complete: end,
        },
        {
          connected: (reconnected) => {
            attempt = 0;
            if (reconnected || afterBreak) handlers.reconnected?.();
          },
        },
      );
    };

    open(false);
    return () => {
      stopped = true;
      clearTimeout(timer);
      dispose();
    };
  };
}

let client: Client<false> | null = null;

/**
 * GraphQL over server-sent events, the protocol Yoga speaks ("distinct connections": one
 * HTTP stream per subscription). The token is read on every connect, so a stream reopened
 * after the laptop slept carries a fresh one.
 */
function sse(): Client<false> {
  client ??= createClient({
    url: `${window.location.origin}/graphql`,
    headers: async (): Promise<Record<string, string>> => {
      const token = await appSession.accessToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    retryAttempts: 5,
    retry: (retries) => wait(exponential(retries)),
  });
  return client;
}

export const subscribe = createSubscriber({ client: sse, session: appSession });
