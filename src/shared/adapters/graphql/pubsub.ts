import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { createPubSub } from 'graphql-yoga';
import { Redis } from 'ioredis';

/**
 * What travels through Redis when a barber's agenda changes. Plain JSON, so it carries the
 * appointment id and the subscription resolver loads the rest.
 */
export type AgendaChangeMessage = {
  type: 'booked' | 'canceled' | 'rescheduled';
  appointmentId: string;
  previousStartsAt: string | null;
};

/**
 * Subscriptions over Redis pub/sub: an event published by any API instance reaches the
 * subscribers connected to every other one. Redis needs a dedicated connection to subscribe.
 *
 * The Yoga adapter does not catch failed Redis commands, and an unhandled rejection would
 * take the whole process down during a Redis outage, so every command is guarded.
 */
export function createAgendaPubSub(redisUrl: string, onError: (error: unknown) => void) {
  const publishClient = guarded(
    new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false }),
    onError,
  );
  const subscribeClient = guarded(new Redis(redisUrl, { maxRetriesPerRequest: 1 }), onError);
  const pubSub = createPubSub<{ agendaChanged: [barberId: string, message: AgendaChangeMessage] }>({
    eventTarget: createRedisEventTarget({ publishClient, subscribeClient }),
  });
  return {
    pubSub,
    close() {
      publishClient.disconnect();
      subscribeClient.disconnect();
    },
  };
}

function guarded(client: Redis, onError: (error: unknown) => void): Redis {
  client.on('error', () => {}); // reconnect noise; failed commands are reported below
  for (const method of ['publish', 'subscribe', 'unsubscribe'] as const) {
    const original = client[method].bind(client) as (...args: unknown[]) => Promise<unknown>;
    (client as unknown as Record<string, unknown>)[method] = (...args: unknown[]) =>
      original(...args).catch((error: unknown) => {
        onError(error);
        return 0;
      });
  }
  return client;
}

export type AgendaPubSub = ReturnType<typeof createAgendaPubSub>['pubSub'];
