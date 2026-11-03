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
 *
 * A stream can also die without either side noticing (the laptop slept, the Wi-Fi changed)
 * and look open for minutes. `onWake` reports the moments that likely happened; the stream is
 * then swapped for a fresh one, and the caller told it reconnected.
 */
export function createSubscriber(options: {
  client: () => SubscriptionClient;
  session: Pick<SessionStore, 'get' | 'accessToken'>;
  backoff?: (attempt: number) => number;
  onWake?: (listener: () => void) => () => void;
}) {
  const { session, backoff = exponential, onWake = () => () => {} } = options;

  return function subscribe<R, V extends Record<string, unknown>>(
    document: TypedDocumentString<R, V>,
    variables: V,
    handlers: Handlers<R>,
  ): () => void {
    let stopped = false;
    let attempt = 0;
    let unauthenticated = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dispose = () => {};
    let generation = 0;

    const restart = () => {
      if (stopped || !session.get()) return;
      if (unauthenticated) void session.accessToken({ force: true }).catch(() => {});
      unauthenticated = false;
      timer = setTimeout(() => open(true), backoff(attempt++));
    };

    const open = (afterBreak: boolean) => {
      if (stopped) return;
      const current = ++generation;
      let ended = false;
      const end = () => {
        // a stream swapped out on wake-up ends quietly
        if (ended || current !== generation) return;
        ended = true;
        restart();
      };
      dispose = options.client().subscribe<R>(
        { query: document.toString(), variables },
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
    const stopWake = onWake(() => {
      if (stopped || !session.get()) return;
      clearTimeout(timer);
      generation++;
      dispose();
      attempt = 0;
      open(true);
    });
    return () => {
      stopped = true;
      stopWake();
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

const AWAY_MS = 60_000;

/** Back online, or back on the tab after a minute or more away (likely a sleep). */
function browserWake(listener: () => void) {
  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) listener();
  };
  window.addEventListener('online', listener);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('online', listener);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export const subscribe = createSubscriber({
  client: sse,
  session: appSession,
  onWake: browserWake,
});
