import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../shared/testing/fixed-clock.js';
import { Notification } from '../domain/notification.js';
import { fakeNotifyDeps } from '../testing/fakes.js';
import type { PushMessage, PushReceipt, PushTicket } from './ports.js';
import { checkPushReceipts, sendPush } from './send-push.js';

const ANA = 'user-ana';
const job = {
  userId: ANA,
  title: 'Lembrete',
  body: 'Corte com João seg 2/11 às 14:00.',
  url: '/agendamento/a1',
};

describe('sendPush', () => {
  let deps: ReturnType<typeof fakeNotifyDeps>;
  let sent: PushMessage[][];
  let answer: (messages: PushMessage[]) => PushTicket[];
  let receipts: Record<string, PushReceipt>;
  let checks: { tickets: { id: string; token: string }[] }[];

  const pushDeps = () => ({
    ...deps,
    pushSender: {
      send: async (messages: PushMessage[]) => {
        sent.push(messages);
        return answer(messages);
      },
      receipts: async () => receipts,
    },
    pushReceipts: {
      schedule: async (check: { tickets: { id: string; token: string }[] }) => {
        checks.push(check);
      },
    },
  });

  beforeEach(async () => {
    const clock = new FixedClock(new Date('2026-11-02T09:00:00Z'));
    deps = fakeNotifyDeps(clock, { users: {}, barbers: {} });
    sent = [];
    checks = [];
    receipts = {};
    answer = (messages) => messages.map((_, i) => ({ status: 'ok', id: `ticket-${i}` }));
    await deps.notifications.insert([
      Notification.create(
        {
          userId: ANA,
          type: 'appointment_reminder',
          title: 't',
          body: 'b',
          appointmentId: null,
          appointmentStartsAt: null,
        },
        clock.now(),
      ),
    ]);
  });

  const register = (token: string) =>
    deps.pushTokens.save({ token, userId: ANA, platform: 'ios', at: new Date() });

  it('does nothing for a user with no phone registered', async () => {
    await sendPush(pushDeps(), job);
    expect(sent).toEqual([]);
    expect(checks).toEqual([]);
  });

  it('sends to every phone, with the unread count as the badge, and checks receipts later', async () => {
    await register('ExpoPushToken[phone]');
    await register('ExpoPushToken[tablet]');

    await sendPush(pushDeps(), job);

    expect(sent).toEqual([
      ['ExpoPushToken[phone]', 'ExpoPushToken[tablet]'].map((to) => ({
        to,
        title: 'Lembrete',
        body: 'Corte com João seg 2/11 às 14:00.',
        data: { url: '/agendamento/a1' },
        badge: 1,
        sound: 'default',
      })),
    ]);
    expect(checks).toEqual([
      {
        tickets: [
          { id: 'ticket-0', token: 'ExpoPushToken[phone]' },
          { id: 'ticket-1', token: 'ExpoPushToken[tablet]' },
        ],
      },
    ]);
  });

  it('forgets a phone Expo says is gone, and logs other refusals', async () => {
    await register('ExpoPushToken[gone]');
    await register('ExpoPushToken[busy]');
    await register('ExpoPushToken[fine]');
    answer = () => [
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', message: 'slow down', details: { error: 'MessageRateExceeded' } },
      { status: 'ok', id: 'ticket-2' },
    ];

    await sendPush(pushDeps(), job);

    expect((await deps.pushTokens.forUser(ANA)).map((t) => t.token)).toEqual([
      'ExpoPushToken[busy]',
      'ExpoPushToken[fine]',
    ]);
    expect(deps.errors).toHaveLength(1);
    expect(checks).toEqual([{ tickets: [{ id: 'ticket-2', token: 'ExpoPushToken[fine]' }] }]);
  });

  it('never deletes a token that a short ticket list does not name', async () => {
    await register('ExpoPushToken[a]');
    await register('ExpoPushToken[b]');
    answer = () => [
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    ];

    await sendPush(pushDeps(), job);

    expect((await deps.pushTokens.forUser(ANA)).map((t) => t.token)).toEqual(['ExpoPushToken[b]']);
  });

  it('drops the phones whose receipts say they are gone', async () => {
    await register('ExpoPushToken[gone]');
    await register('ExpoPushToken[fine]');
    receipts = {
      r1: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      r2: { status: 'ok' },
      r3: { status: 'error', message: 'creds', details: { error: 'InvalidCredentials' } },
    };

    await checkPushReceipts(pushDeps(), {
      tickets: [
        { id: 'r1', token: 'ExpoPushToken[gone]' },
        { id: 'r2', token: 'ExpoPushToken[fine]' },
        { id: 'r3', token: 'ExpoPushToken[fine]' },
        { id: 'not-ready', token: 'ExpoPushToken[fine]' },
      ],
    });

    expect((await deps.pushTokens.forUser(ANA)).map((t) => t.token)).toEqual([
      'ExpoPushToken[fine]',
    ]);
    expect(deps.errors).toHaveLength(1);
  });
});
