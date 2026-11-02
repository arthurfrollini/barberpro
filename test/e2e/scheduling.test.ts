import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeMailer } from '../../src/modules/shops/testing/in-memory.js';
import { FixedClock } from '../../src/shared/testing/fixed-clock.js';
import { createTestApp, type TestApp } from '../support/app.js';
import { truncateAll } from '../support/db.js';
import { errorCode, gql } from '../support/gql.js';

const MONDAY = '2026-11-02'; // São Paulo, UTC-3
const START = '2026-11-02T09:00:00Z'; // 06:00 local

describe('scheduling over GraphQL', () => {
  let t: TestApp;
  const clock = new FixedClock(new Date(START));

  beforeAll(async () => {
    t = await createTestApp(undefined, { clock, mailer: new FakeMailer() });
  });
  beforeEach(async () => {
    clock.set(START);
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

  // the fixed clock also ages access tokens, so after moving it a test signs in again
  const signIn = async (name: string) =>
    (
      await gql(
        t.app,
        'mutation ($input: SignInInput!) { signIn(input: $input) { accessToken } }',
        { input: { email: `${name.toLowerCase()}@x.com`, password: 'correct horse' } },
      )
    ).data!.signIn.accessToken as string;

  /** An owner who barbers in their own shop, with one 30-minute service and weekly hours. */
  const barber = async (name: string, hours: [string, string][]) => {
    const token = await signUp(name);
    await gql(
      t.app,
      `mutation { createBarbershop(input: { name: "${name} Cortes", foundedYear: 2010,
        address: "Rua 1", latitude: -23.56, longitude: -46.65 }) { id } }`,
      {},
      token,
    );
    const barberId = (await gql(t.app, 'mutation { becomeBarber { id } }', {}, token)).data!
      .becomeBarber.id as string;
    const serviceId = (
      await gql(
        t.app,
        'mutation { createService(input: { name: "Corte", priceCents: 6000, durationMinutes: 30 }) { id } }',
        {},
        token,
      )
    ).data!.createService.id as string;
    const intervals = [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
      hours.map(([startTime, endTime]) => ({ weekday, startTime, endTime })),
    );
    const set = await gql(
      t.app,
      `mutation ($intervals: [WeeklyIntervalInput!]!) {
        setWeeklySchedule(intervals: $intervals) { weekly { weekday startTime endTime } }
      }`,
      { intervals },
      token,
    );
    expect(set.errors).toBeUndefined();
    return { token, barberId, serviceId };
  };

  const BOOK = `mutation ($input: BookAppointmentInput!) {
    bookAppointment(input: $input) { id startsAt endsAt status priceCents reminderLeadMinutes }
  }`;
  const book = (token: string, b: { barberId: string; serviceId: string }, startsAt: string) =>
    gql(
      t.app,
      BOOK,
      {
        input: { barberId: b.barberId, serviceId: b.serviceId, startsAt, reminderLeadMinutes: 15 },
      },
      token,
    );

  it('runs a day: slots, booking, overlap, two-hour rule, reschedule, agenda, blocked day', async () => {
    const joao = await barber('Joao', [
      ['10:00', '12:00'],
      ['14:00', '22:00'],
    ]);
    const jose = await barber('Jose', [['08:00', '20:00']]);
    const ana = await signUp('Ana');
    const bia = await signUp('Bia');

    const slots = await gql(
      t.app,
      'query ($b: ID!, $s: ID!, $d: String!) { availableSlots(barberId: $b, serviceId: $s, date: $d) }',
      { b: joao.barberId, s: joao.serviceId, d: MONDAY },
    );
    expect(slots.data!.availableSlots).toHaveLength(38);
    expect(slots.data!.availableSlots).not.toContain('2026-11-02T15:00:00.000Z');

    const booked = await book(ana, joao, '2026-11-02T17:00:00Z');
    const appointment = booked.data!.bookAppointment;
    expect(appointment).toMatchObject({
      startsAt: '2026-11-02T17:00:00.000Z',
      endsAt: '2026-11-02T17:30:00.000Z',
      status: 'BOOKED',
      priceCents: 6000,
      reminderLeadMinutes: 15,
    });

    expect(errorCode(await book(bia, joao, '2026-11-02T17:00:00Z'))).toBe('SLOT_UNAVAILABLE');
    expect(errorCode(await book(ana, jose, '2026-11-02T17:15:00Z'))).toBe('CUSTOMER_BUSY');

    clock.set('2026-11-02T15:01:00Z');
    const late = await gql(
      t.app,
      'mutation ($id: ID!) { cancelAppointment(id: $id) { id } }',
      { id: appointment.id },
      await signIn('Ana'),
    );
    expect(errorCode(late)).toBe('CANCELLATION_WINDOW_CLOSED');
    clock.set(START);

    const moved = await gql(
      t.app,
      'mutation ($id: ID!, $at: DateTime!) { rescheduleAppointment(id: $id, startsAt: $at) { id startsAt } }',
      { id: appointment.id, at: '2026-11-02T16:00:00-03:00' },
      ana,
    );
    expect(moved.data!.rescheduleAppointment).toEqual({
      id: appointment.id,
      startsAt: '2026-11-02T19:00:00.000Z',
    });

    const agenda = await gql(
      t.app,
      `{ barberAgenda(date: "${MONDAY}") { id customer { name } barber { name } serviceName } }`,
      {},
      joao.token,
    );
    expect(agenda.data!.barberAgenda).toEqual([
      {
        id: appointment.id,
        customer: { name: 'Ana' },
        barber: { name: 'Joao' },
        serviceName: 'Corte',
      },
    ]);

    const blocked = await gql(
      t.app,
      `mutation { blockDate(date: "${MONDAY}") { id cancelReason } }`,
      {},
      joao.token,
    );
    expect(blocked.data!.blockDate).toEqual([{ id: appointment.id, cancelReason: 'DAY_BLOCKED' }]);

    const mine = await gql(t.app, '{ myAppointments { id status cancelReason } }', {}, ana);
    expect(mine.data!.myAppointments).toEqual([
      { id: appointment.id, status: 'CANCELED', cancelReason: 'DAY_BLOCKED' },
    ]);
  });

  it("cancels a removed barber's appointments that are 2 hours or more away", async () => {
    const owner = await barber('Marcos', [['08:00', '20:00']]);
    const ana = await signUp('Ana');
    const booked = (await book(ana, owner, '2026-11-02T18:00:00Z')).data!.bookAppointment;

    await gql(
      t.app,
      'mutation ($id: ID!) { removeBarber(id: $id) { id } }',
      { id: owner.barberId },
      owner.token,
    );

    const mine = await gql(t.app, '{ myAppointments { id status cancelReason } }', {}, ana);
    expect(mine.data!.myAppointments).toEqual([
      { id: booked.id, status: 'CANCELED', cancelReason: 'BARBER_REMOVED' },
    ]);
  });

  it('rejects a start time without a timezone', async () => {
    const joao = await barber('Joao', [['10:00', '12:00']]);
    const ana = await signUp('Ana');

    const res = await book(ana, joao, '2026-11-02T14:00:00');

    expect(res.errors?.[0]?.message).toMatch(/ISO 8601/);
  });

  it('shows the barber his own hours and days off', async () => {
    const joao = await barber('Joao', [['10:00', '12:00']]);
    await gql(t.app, 'mutation { blockDate(date: "2026-11-05") { id } }', {}, joao.token);

    const res = await gql(
      t.app,
      '{ mySchedule { weekly { weekday startTime endTime } blockedDates } }',
      {},
      joao.token,
    );

    expect(res.data!.mySchedule.weekly[0]).toEqual({
      weekday: 1,
      startTime: '10:00',
      endTime: '12:00',
    });
    expect(res.data!.mySchedule.blockedDates).toEqual(['2026-11-05']);
  });
});
