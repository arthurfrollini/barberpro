import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { UnrecoverableError } from 'bullmq';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ExpoPushSender } from '../../src/modules/notifications/adapters/push/expo-push-sender.js';

type Seen = { path: string; headers: IncomingMessage['headers']; body: unknown };

/** Expo's push API, played by a local server that records what it gets. */
describe('Expo push sender', () => {
  let server: Server;
  let base: string;
  const seen: Seen[] = [];
  let reply: (path: string, body: any) => { status: number; json: unknown };

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        const body = JSON.parse(raw);
        seen.push({ path: req.url!, headers: req.headers, body });
        const { status, json } = reply(req.url!, body);
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(json));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://localhost:${(server.address() as AddressInfo).port}/--/api/v2/push`;
  });
  afterEach(() => {
    seen.length = 0;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const message = (i: number) => ({
    to: `ExpoPushToken[${i}]`,
    title: 'Lembrete',
    body: 'Corte',
    data: { url: '/avisos' },
    badge: 1,
    sound: 'default' as const,
  });

  it('sends in chunks of 100 and returns the tickets in order', async () => {
    reply = (_path, body) => ({
      status: 200,
      json: { data: body.map((m: { to: string }) => ({ status: 'ok', id: `t-${m.to}` })) },
    });
    const sender = new ExpoPushSender(base);

    const tickets = await sender.send(Array.from({ length: 101 }, (_, i) => message(i)));

    expect(seen.map((s) => [s.path, (s.body as unknown[]).length])).toEqual([
      ['/--/api/v2/push/send', 100],
      ['/--/api/v2/push/send', 1],
    ]);
    expect(tickets).toHaveLength(101);
    expect(tickets[100]).toEqual({ status: 'ok', id: 't-ExpoPushToken[100]' });
    expect(seen[0]!.headers.authorization).toBeUndefined();
  });

  it('sends the access token when one is configured', async () => {
    reply = () => ({ status: 200, json: { data: [{ status: 'ok', id: 't' }] } });
    await new ExpoPushSender(base, 'secret-token').send([message(1)]);
    expect(seen[0]!.headers.authorization).toBe('Bearer secret-token');
  });

  it('throws on rate limits, server errors and request-level errors, so the job retries', async () => {
    const sender = new ExpoPushSender(base);
    reply = () => ({ status: 429, json: { errors: [{ code: 'TOO_MANY_REQUESTS' }] } });
    await expect(sender.send([message(1)])).rejects.toThrow(/429/);
    reply = () => ({ status: 503, json: {} });
    await expect(sender.send([message(1)])).rejects.toThrow(/503/);
    reply = () => ({
      status: 200,
      json: { errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS', message: 'mixed' }] },
    });
    await expect(sender.send([message(1)])).rejects.toThrow(/PUSH_TOO_MANY_EXPERIENCE_IDS/);
  });

  it('refuses an answer with the wrong number of tickets, so no token gets the wrong ticket', async () => {
    reply = () => ({ status: 200, json: { data: [{ status: 'ok', id: 'only-one' }] } });
    await expect(new ExpoPushSender(base).send([message(1), message(2)])).rejects.toThrow(
      /2 messages/,
    );
  });

  it('does not retry a request Expo refused as malformed', async () => {
    reply = () => ({
      status: 400,
      json: { errors: [{ code: 'VALIDATION_ERROR', message: 'bad' }] },
    });
    await expect(new ExpoPushSender(base).send([message(1)])).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('sends nothing for no messages', async () => {
    expect(await new ExpoPushSender(base).send([])).toEqual([]);
    expect(seen).toEqual([]);
  });

  it('reads receipts in chunks of 1000', async () => {
    reply = (_path, body) => ({
      status: 200,
      json: { data: Object.fromEntries(body.ids.map((id: string) => [id, { status: 'ok' }])) },
    });
    const ids = Array.from({ length: 1001 }, (_, i) => `r${i}`);

    const receipts = await new ExpoPushSender(base).receipts(ids);

    expect(seen.map((s) => [s.path, (s.body as { ids: string[] }).ids.length])).toEqual([
      ['/--/api/v2/push/getReceipts', 1000],
      ['/--/api/v2/push/getReceipts', 1],
    ]);
    expect(Object.keys(receipts)).toHaveLength(1001);
  });
});
