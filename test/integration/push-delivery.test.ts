import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExpoPushSender } from '../../src/modules/notifications/adapters/push/expo-push-sender.js';
import {
  checkPushReceipts,
  sendPush,
} from '../../src/modules/notifications/application/send-push.js';
import { fakeNotifyDeps } from '../../src/modules/notifications/testing/fakes.js';
import {
  BullMqPushQueue,
  BullMqPushReceipts,
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

/** The whole worker path, as worker.ts wires it: queue → sendPush → Expo (a local fake) → receipts. */
describe('push delivery through the worker', () => {
  const prefix = `barberpro-test-${randomUUID().slice(0, 8)}`;
  const connection = createQueueConnection(process.env.REDIS_URL!);
  const expo: { path: string; body: any }[] = [];
  let server: Server;
  let workers: Awaited<ReturnType<typeof startWorkers>>;
  const queue = new BullMqPushQueue(connection, prefix);
  const receipts = new BullMqPushReceipts(connection, prefix, 0);
  const deps = fakeNotifyDeps(new FixedClock(new Date()), { users: {}, barbers: {} });

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const body = JSON.parse(raw);
        expo.push({ path: req.url!, body });
        const data = req.url!.endsWith('/send')
          ? body.map((_: unknown, i: number) => ({ status: 'ok', id: `ticket-${i}` }))
          : {
              'ticket-0': {
                status: 'error',
                message: 'gone',
                details: { error: 'DeviceNotRegistered' },
              },
            };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const push = {
      ...deps,
      pushSender: new ExpoPushSender(`http://localhost:${(server.address() as AddressInfo).port}`),
      pushReceipts: receipts,
    };
    workers = startWorkers({
      connection,
      prefix,
      mailer: { send: async () => {} },
      sendReminder: async () => {},
      sendPush: (job) => sendPush(push, job),
      checkPushReceipts: (check) => checkPushReceipts(push, check),
    });
  });
  afterAll(async () => {
    await workers.close();
    await queue.close();
    await receipts.close();
    connection.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('sends a queued push to the phone, then forgets the phone its receipt says is gone', async () => {
    await deps.pushTokens.save({
      token: 'ExpoPushToken[ana]',
      userId: 'ana',
      platform: 'ios',
      at: new Date(),
    });

    await queue.enqueue({
      userId: 'ana',
      title: 'Lembrete',
      body: 'Corte às 14:00.',
      url: '/avisos',
    });

    await waitFor(() => expo.some((r) => r.path === '/getReceipts'));
    expect(expo[0]).toEqual({
      path: '/send',
      body: [
        {
          to: 'ExpoPushToken[ana]',
          title: 'Lembrete',
          body: 'Corte às 14:00.',
          data: { url: '/avisos' },
          badge: 0,
          sound: 'default',
        },
      ],
    });
    await waitFor(() => deps.pushTokenRows.size === 0);
  });
});
