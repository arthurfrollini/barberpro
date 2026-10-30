import { describe, expect, it } from 'vitest';
import { createAgendaPubSub } from '../../src/shared/adapters/graphql/pubsub.js';
import {
  BullMqMailQueue,
  createProducerConnection,
} from '../../src/shared/adapters/queue/bullmq.js';

// nothing listens on this port: it stands for Redis being down
const DEAD_REDIS = 'redis://127.0.0.1:6399';

describe('with Redis down', () => {
  it('enqueueing fails fast instead of hanging the request', async () => {
    const connection = createProducerConnection(DEAD_REDIS);
    const queue = new BullMqMailQueue(connection, 'barberpro-test-dead');
    const started = Date.now();

    await expect(queue.enqueue({ to: 'a@x.com', subject: 's', text: 't' })).rejects.toThrow();

    expect(Date.now() - started).toBeLessThan(3_000);
    connection.disconnect();
  });

  it('publishing to the live agenda reports the error instead of crashing the process', async () => {
    const errors: unknown[] = [];
    const agenda = createAgendaPubSub(DEAD_REDIS, (error) => errors.push(error));

    agenda.pubSub.publish('agendaChanged', 'barber-1', {
      type: 'booked',
      appointmentId: 'a-1',
      previousStartsAt: null,
    });

    await expect.poll(() => errors.length, { timeout: 3_000 }).toBeGreaterThan(0);
    agenda.close();
  });
});
