import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TypedDocumentString } from '@/gql/graphql';
import { createSubscriber, type SubscriptionClient } from './subscriptions';

const Doc = new TypedDocumentString<{ ping: number }, Record<string, never>>(
  'subscription { ping }',
);

type Sink = Parameters<SubscriptionClient['subscribe']>[1];
type On = Parameters<SubscriptionClient['subscribe']>[2];

function fakeClient() {
  const streams: { sink: Sink; on: On; disposed: boolean }[] = [];
  const client: SubscriptionClient = {
    subscribe: (_request, sink, on) => {
      const stream = { sink, on, disposed: false };
      streams.push(stream);
      return () => {
        stream.disposed = true;
        sink.complete();
      };
    },
  };
  return { client, streams, last: () => streams.at(-1)! };
}

function setup({ signedIn = true } = {}) {
  const fake = fakeClient();
  const stored = {
    accessToken: 't',
    accessTokenExpiresAt: '2099-01-01T00:00:00Z',
    refreshToken: 'r',
  };
  const session = {
    get: vi.fn(() => (signedIn ? stored : null)),
    accessToken: vi.fn(async (_options?: { force?: boolean }) => 't' as string | null),
  };
  const wakeListeners = new Set<() => void>();
  const wake = () => wakeListeners.forEach((listener) => listener());
  const subscribe = createSubscriber({
    client: () => fake.client,
    session,
    backoff: () => 1000,
    onWake: (listener) => {
      wakeListeners.add(listener);
      return () => wakeListeners.delete(listener);
    },
  });
  const next = vi.fn();
  const reconnected = vi.fn();
  const stop = subscribe(Doc, {}, { next, reconnected });
  return { ...fake, session, next, reconnected, stop, wake, wakeListeners };
}

describe('subscribe', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('passes data on', () => {
    const { last, next } = setup();
    last().sink.next({ data: { ping: 1 } });
    expect(next).toHaveBeenCalledWith({ ping: 1 });
  });

  it('opens a new stream after the server ends one, and says it reconnected', () => {
    const { streams, last, reconnected } = setup();
    last().sink.complete();
    expect(streams).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(streams).toHaveLength(2);
    last().on?.connected?.(false);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('opens a new stream after an error the client gave up on', () => {
    const { streams, last } = setup();
    last().sink.error(new Error('Failed to fetch'));
    vi.advanceTimersByTime(1000);
    expect(streams).toHaveLength(2);
  });

  it('renews the token before retrying a stream the API refused as unauthenticated', async () => {
    const { last, session, streams } = setup();
    last().sink.next({
      errors: [{ message: 'no', extensions: { code: 'UNAUTHENTICATED' } }],
    } as never);
    last().sink.complete();
    expect(session.accessToken).toHaveBeenCalledWith({ force: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(streams).toHaveLength(2);
  });

  it('swaps the stream for a fresh one when the device wakes or comes back online', () => {
    // a stream that died while the laptop slept can look open for minutes
    const { streams, last, reconnected, wake } = setup();
    last().on?.connected?.(false);
    wake();
    expect(streams).toHaveLength(2);
    expect(streams[0]!.disposed).toBe(true);
    last().on?.connected?.(false);
    expect(reconnected).toHaveBeenCalledTimes(1);
    // closing the old stream does not schedule yet another one
    vi.advanceTimersByTime(5000);
    expect(streams).toHaveLength(2);
  });

  it('stops listening for wake-ups once stopped', () => {
    const { stop, wakeListeners } = setup();
    expect(wakeListeners.size).toBe(1);
    stop();
    expect(wakeListeners.size).toBe(0);
  });

  it('stays closed once stopped, and after a sign-out', () => {
    const stopped = setup();
    stopped.stop();
    vi.advanceTimersByTime(5000);
    expect(stopped.streams).toHaveLength(1);
    expect(stopped.streams[0]!.disposed).toBe(true);

    const signedOut = setup({ signedIn: false });
    signedOut.last().sink.complete();
    vi.advanceTimersByTime(5000);
    expect(signedOut.streams).toHaveLength(1);
  });
});
