import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeMailer } from '../../src/modules/shops/testing/in-memory.js';
import {
  BullMqMailQueue,
  BullMqReminders,
  createQueueConnection,
  startWorkers,
} from '../../src/shared/adapters/queue/bullmq.js';
import { FixedClock } from '../../src/shared/testing/fixed-clock.js';

const waitFor = async (check: () => boolean, timeoutMs = 5000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 25));
  }
};

describe('BullMQ adapters', () => {
  // a prefix per run keeps these jobs away from any other queue on the same Redis
  const prefix = `barberpro-test-${randomUUID().slice(0, 8)}`;
  const connection = createQueueConnection(process.env.REDIS_URL!);
  const clock = new FixedClock(new Date());
  const mailQueue = new BullMqMailQueue(connection, prefix);
  const reminders = new BullMqReminders(connection, prefix, clock);
  const mailer = new FakeMailer();
  const remindersSent: string[] = [];
  let workers: Awaited<ReturnType<typeof startWorkers>>;

  beforeAll(() => {
    workers = startWorkers({
      connection,
      prefix,
      mailer,
      sendReminder: async (appointmentId) => {
        remindersSent.push(appointmentId);
      },
    });
  });
  afterAll(async () => {
    await workers.close();
    await mailQueue.close();
    await reminders.close();
    connection.disconnect();
  });

  it('delivers queued email through the worker', async () => {
    await mailQueue.enqueue({ to: 'jose@x.com', subject: 'Hi', text: 'Hello' });

    await waitFor(() => mailer.sent.length === 1);
    expect(mailer.sent[0]).toEqual({ to: 'jose@x.com', subject: 'Hi', text: 'Hello' });
  });

  it('keeps one delayed reminder per appointment and removes it on cancel', async () => {
    const id = randomUUID();

    await reminders.schedule(id, new Date(clock.now().getTime() + 10 * 60_000));
    await reminders.schedule(id, new Date(clock.now().getTime() + 30 * 60_000));

    expect(await reminders.pending(id)).toEqual({ delayMs: 30 * 60_000 });
    await reminders.cancel(id);
    expect(await reminders.pending(id)).toBeNull();
    await reminders.cancel(id);
  });

  it('runs a reminder that is due', async () => {
    const id = randomUUID();

    await reminders.schedule(id, clock.now());

    await waitFor(() => remindersSent.includes(id));
  });

  it('reports an email it gave up on, so an undelivered invite can be revoked', async () => {
    const failingPrefix = `${prefix}-fail`;
    const queue = new BullMqMailQueue(connection, failingPrefix, { attempts: 1 });
    const gaveUp: string[] = [];
    const failing = startWorkers({
      connection,
      prefix: failingPrefix,
      mailer: {
        send: async () => {
          throw new Error('SMTP down');
        },
      },
      sendReminder: async () => {},
      onMailGaveUp: async (message) => {
        gaveUp.push(message.inviteId ?? 'none');
      },
    });

    await queue.enqueue({
      to: 'jose@x.com',
      subject: 'Invite',
      text: 'code',
      inviteId: 'invite-1',
    });

    await waitFor(() => gaveUp.length === 1);
    expect(gaveUp).toEqual(['invite-1']);
    await failing.close();
    await queue.close();
  });
});
