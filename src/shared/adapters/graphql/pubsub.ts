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
 */
export function createAgendaPubSub(redisUrl: string) {
  const publishClient = new Redis(redisUrl);
  const subscribeClient = new Redis(redisUrl);
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

export type AgendaPubSub = ReturnType<typeof createAgendaPubSub>['pubSub'];
