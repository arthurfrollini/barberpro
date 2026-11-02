import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeMailer } from '../../src/modules/shops/testing/in-memory.js';
import { FixedClock } from '../../src/shared/testing/fixed-clock.js';
import { createTestApp, type TestApp } from '../support/app.js';
import { truncateAll } from '../support/db.js';
import { errorCode, gql } from '../support/gql.js';

describe('notifications and the live agenda', () => {
  let t: TestApp;
  const clock = new FixedClock(new Date('2026-11-02T09:00:00Z'));

  beforeAll(async () => {
    t = await createTestApp(undefined, { clock, mailer: new FakeMailer() });
  });
  beforeEach(async () => {
    clock.set('2026-11-02T09:00:00Z');
    await truncateAll(t.container.dataSource);
  });
  afterAll(() => t.close());

  const signUp = async (name: string) =>
    (
      await gql(
        t.app,
        'mutation ($input: SignUpInput!) { signUp(input: $input) { accessToken } }',
        { input: { name, email: `${name.toLowerCase()}@x.com`, password: 'correct horse' } },
      )
    ).data!.signUp.accessToken as string;

  const barber = async (name: string) => {
    const token = await signUp(name);
    const shopId = (
      await gql(
        t.app,
        `mutation { createBarbershop(input: { name: "${name} Cortes", foundedYear: 2010,
          address: "Rua 1", latitude: -23.56, longitude: -46.65 }) { id } }`,
        {},
        token,
      )
    ).data!.createBarbershop.id;
    const barberId = (
      await gql(
        t.app,
        'mutation ($shopId: ID!) { becomeBarber(shopId: $shopId) { id } }',
        { shopId },
        token,
      )
    ).data!.becomeBarber.id;
    const serviceId = (
      await gql(
        t.app,
        'mutation ($barberId: ID!) { createService(barberId: $barberId, input: { name: "Corte", priceCents: 6000, durationMinutes: 30 }) { id } }',
        { barberId },
        token,
      )
    ).data!.createService.id;
    await gql(
      t.app,
      'mutation ($barberId: ID!) { setWeeklySchedule(barberId: $barberId, intervals: [{ weekday: 1, startTime: "08:00", endTime: "20:00" }]) { weekly { weekday } } }',
      { barberId },
      token,
    );
    return { token, barberId, serviceId };
  };

  const book = (token: string, b: { barberId: string; serviceId: string }, startsAt: string) =>
    gql(
      t.app,
      'mutation ($input: BookAppointmentInput!) { bookAppointment(input: $input) { id } }',
      {
        input: { barberId: b.barberId, serviceId: b.serviceId, startsAt, reminderLeadMinutes: 15 },
      },
      token,
    );

  const NOTIFICATIONS =
    '{ notifications { id type title body read appointment { id } } unreadNotificationCount }';

  it('tells the barber about a booking and the customer about a cancellation', async () => {
    const joao = await barber('Joao');
    const ana = await signUp('Ana');
    const id = (await book(ana, joao, '2026-11-02T17:00:00Z')).data!.bookAppointment.id;

    const forJoao = (await gql(t.app, NOTIFICATIONS, {}, joao.token)).data!;
    expect(forJoao.unreadNotificationCount).toBe(1);
    expect(forJoao.notifications).toEqual([
      expect.objectContaining({
        type: 'APPOINTMENT_BOOKED',
        title: 'New booking',
        body: 'Ana booked Corte on Mon, Nov 2 at 14:00.',
        read: false,
        appointment: { id },
      }),
    ]);

    await gql(
      t.app,
      'mutation ($id: ID!) { cancelAppointment(id: $id) { id } }',
      { id },
      joao.token,
    );

    const forAna = (await gql(t.app, NOTIFICATIONS, {}, ana)).data!;
    expect(forAna.notifications.map((n: { type: string }) => n.type)).toEqual([
      'APPOINTMENT_CANCELED',
    ]);
  });

  it('keeps the time each notification was about after the appointment moves', async () => {
    const joao = await barber('Joao');
    const ana = await signUp('Ana');
    const id = (await book(ana, joao, '2026-11-02T17:00:00Z')).data!.bookAppointment.id;
    await gql(
      t.app,
      'mutation ($id: ID!, $at: DateTime!) { rescheduleAppointment(id: $id, startsAt: $at) { id } }',
      { id, at: '2026-11-02T18:00:00Z' },
      ana,
    );

    const list = (
      await gql(
        t.app,
        '{ notifications { type appointmentStartsAt appointment { startsAt } } }',
        {},
        joao.token,
      )
    ).data!.notifications;
    // both are created at the same instant on the test clock: compare without order
    expect(list).toHaveLength(2);
    expect(list).toEqual(
      expect.arrayContaining([
        {
          type: 'APPOINTMENT_RESCHEDULED',
          appointmentStartsAt: '2026-11-02T18:00:00.000Z',
          appointment: { startsAt: '2026-11-02T18:00:00.000Z' },
        },
        {
          type: 'APPOINTMENT_BOOKED',
          appointmentStartsAt: '2026-11-02T17:00:00.000Z',
          appointment: { startsAt: '2026-11-02T18:00:00.000Z' },
        },
      ]),
    );
  });

  it('marks a notification read for its owner only', async () => {
    const joao = await barber('Joao');
    const ana = await signUp('Ana');
    await book(ana, joao, '2026-11-02T17:00:00Z');
    const [note] = (await gql(t.app, NOTIFICATIONS, {}, joao.token)).data!.notifications;

    const stranger = await gql(
      t.app,
      'mutation ($id: ID!) { markNotificationRead(id: $id) }',
      { id: note.id },
      ana,
    );
    expect(errorCode(stranger)).toBe('NOTIFICATION_NOT_FOUND');

    await gql(
      t.app,
      'mutation ($id: ID!) { markNotificationRead(id: $id) }',
      { id: note.id },
      joao.token,
    );
    expect((await gql(t.app, NOTIFICATIONS, {}, joao.token)).data!.unreadNotificationCount).toBe(0);
  });

  describe('agendaChanged over server-sent events', () => {
    let base: string;
    beforeAll(async () => {
      await t.app.listen({ port: 0, host: '127.0.0.1' });
      base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
    });

    const subscribe = (token?: string, barberId = 'none') =>
      fetch(`${base}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query:
            'subscription ($barberId: ID!) { agendaChanged(barberId: $barberId) { type appointment { id customer { name } } } }',
          variables: { barberId },
        }),
      });

    /** Reads the stream until `count` `data:` lines arrived and parses them. */
    const events = async (res: Response, count: number) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) throw new Error(`stream ended: ${text}`);
        text += decoder.decode(value);
        const lines = text.split('\n').filter((l) => l.startsWith('data:') && l.length > 6);
        if (lines.length >= count) {
          await reader.cancel();
          return lines.slice(0, count).map((l) => JSON.parse(l.slice(5)));
        }
      }
    };
    const firstEvent = async (res: Response) => (await events(res, 1))[0];

    it("pushes a new booking to the barber's open subscription", async () => {
      const joao = await barber('Joao');
      const ana = await signUp('Ana');
      const stream = await subscribe(joao.token, joao.barberId);
      const event = firstEvent(stream);
      // give the subscription a moment to reach Redis before publishing
      await new Promise((r) => setTimeout(r, 300));

      const id = (await book(ana, joao, '2026-11-02T17:00:00Z')).data!.bookAppointment.id;

      expect(await event).toEqual({
        data: { agendaChanged: { type: 'BOOKED', appointment: { id, customer: { name: 'Ana' } } } },
      });
    });

    it('shows each change with the appointment as it is now, not as it was first seen', async () => {
      const joao = await barber('Joao');
      const ana = await signUp('Ana');
      const stream = events(
        await fetch(`${base}/graphql`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'text/event-stream',
            authorization: `Bearer ${joao.token}`,
          },
          body: JSON.stringify({
            query:
              'subscription ($barberId: ID!) { agendaChanged(barberId: $barberId) { type appointment { status startsAt } } }',
            variables: { barberId: joao.barberId },
          }),
        }),
        3,
      );
      await new Promise((r) => setTimeout(r, 300));

      const id = (await book(ana, joao, '2026-11-02T17:00:00Z')).data!.bookAppointment.id;
      await gql(
        t.app,
        'mutation ($id: ID!) { rescheduleAppointment(id: $id, startsAt: "2026-11-02T18:00:00Z") { id } }',
        { id },
        ana,
      );
      await gql(t.app, 'mutation ($id: ID!) { cancelAppointment(id: $id) { id } }', { id }, ana);

      expect((await stream).map((e) => e.data.agendaChanged)).toEqual([
        { type: 'BOOKED', appointment: { status: 'BOOKED', startsAt: '2026-11-02T17:00:00.000Z' } },
        {
          type: 'RESCHEDULED',
          appointment: { status: 'BOOKED', startsAt: '2026-11-02T18:00:00.000Z' },
        },
        {
          type: 'CANCELED',
          appointment: { status: 'CANCELED', startsAt: '2026-11-02T18:00:00.000Z' },
        },
      ]);
    });

    it('refuses a subscription to someone who is not a barber', async () => {
      const ana = await signUp('Ana');

      const event = await firstEvent(await subscribe(ana));

      expect(event.errors[0].extensions.code).toBe('NOT_A_BARBER');
    });

    it('refuses a subscription without a token', async () => {
      const event = await firstEvent(await subscribe());

      expect(event.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });
  });
});
