import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../shared/testing/fixed-clock.js';
import { Email } from '../../identity/domain/email.js';
import { User } from '../../identity/domain/user.js';
import { becomeBarber } from '../../shops/application/barbers.js';
import { createBarbershop } from '../../shops/application/barbershops.js';
import { archiveService, createService } from '../../shops/application/services.js';
import { inMemorySchedulingDeps } from '../testing/in-memory.js';
import { barberAgenda, myAppointments } from './agenda.js';
import {
  availableSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from './booking.js';
import { blockDate, cancelFutureForBarber, setWeeklySchedule } from './schedule.js';

const code = (c: string) => expect.objectContaining({ code: c });
const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const at = (iso: string) => new Date(iso);
const MONDAY = '2026-11-02'; // São Paulo, UTC-3

describe('scheduling use cases', () => {
  let clock: FixedClock;
  let deps: ReturnType<typeof inMemorySchedulingDeps>;
  let ana: User;
  let bia: User;
  let joao: { user: User; barberId: string; serviceId: string };
  let jose: { user: User; barberId: string; serviceId: string };

  const addUser = async (name: string) => {
    const user = User.create({
      name,
      email: Email.parse(`${name}@x.com`),
      passwordHash: 'h',
      now: clock.now(),
    });
    await deps.shopsDeps.users.save(user);
    return user;
  };

  const addBarber = async (name: string, hours: [number, number][]) => {
    const user = await addUser(name);
    await createBarbershop(deps.shopsDeps, user.id, {
      name: `${name} cortes`,
      description: '',
      foundedYear: 2010,
      logoFileId: null,
      address: 'Rua 1',
      latitude: -23.56,
      longitude: -46.65,
      timezone: 'America/Sao_Paulo',
    });
    const barber = await becomeBarber(deps.shopsDeps, user.id);
    const service = await createService(deps.shopsDeps, user.id, {
      name: 'Corte',
      description: '',
      priceCents: 6000,
      durationMinutes: 30,
    });
    await setWeeklySchedule(
      deps,
      user.id,
      hours.map(([startMinute, endMinute]) => ({ weekday: 1, startMinute, endMinute })),
    );
    return { user, barberId: barber.id, serviceId: service.id };
  };

  const book = (who: User, barber: typeof joao, startsAt: string, reminder: number | null = 15) =>
    bookAppointment(deps, who.id, {
      barberId: barber.barberId,
      serviceId: barber.serviceId,
      startsAt: at(startsAt),
      reminderLeadMinutes: reminder,
    });

  beforeEach(async () => {
    clock = new FixedClock(at('2026-11-02T09:00:00Z')); // 06:00 local
    deps = inMemorySchedulingDeps(clock);
    ana = await addUser('ana');
    bia = await addUser('bia');
    joao = await addBarber('joao', [
      [h(10), h(12)],
      [h(14), h(22)],
    ]);
    jose = await addBarber('jose', [[h(8), h(20)]]);
  });

  describe('availableSlots', () => {
    it("lists João's free starts and skips his break", async () => {
      const slots = await availableSlots(deps, { ...joao, date: MONDAY });

      expect(slots).toHaveLength(38);
      expect(slots.map((s) => s.toISOString())).not.toContain('2026-11-02T15:00:00.000Z');
    });

    it('refuses archived services and services of another barber', async () => {
      await archiveService(deps.shopsDeps, joao.user.id, joao.serviceId);

      await expect(availableSlots(deps, { ...joao, date: MONDAY })).rejects.toEqual(
        code('SERVICE_NOT_FOUND'),
      );
      await expect(
        availableSlots(deps, { barberId: jose.barberId, serviceId: joao.serviceId, date: MONDAY }),
      ).rejects.toEqual(code('SERVICE_NOT_FOUND'));
    });

    it('validates the date', async () => {
      await expect(availableSlots(deps, { ...joao, date: '2026-02-30' })).rejects.toEqual(
        code('INVALID_DATE'),
      );
    });
  });

  describe('bookAppointment', () => {
    it('books a free start, publishes it and takes the slot', async () => {
      const a = await book(ana, joao, '2026-11-02T17:00:00Z');

      expect(a).toMatchObject({ status: 'booked', priceCents: 6000, reminderLeadMinutes: 15 });
      expect(deps.events.published.map((e) => e.type)).toEqual(['booked']);
      const slots = (await availableSlots(deps, { ...joao, date: MONDAY })).map((s) =>
        s.toISOString(),
      );
      expect(slots).not.toContain('2026-11-02T17:00:00.000Z');
      expect(slots).not.toContain('2026-11-02T16:45:00.000Z');
    });

    it.each([
      ['2026-11-02T14:45:00Z', '11:45 runs into the break'],
      ['2026-11-02T15:00:00Z', 'the break itself'],
      ['2026-11-02T13:07:00Z', 'off the 15-minute grid'],
      ['2026-11-08T17:00:00Z', 'a Sunday, no hours'],
    ])('refuses %s (%s)', async (startsAt) => {
      await expect(book(ana, joao, startsAt)).rejects.toEqual(code('SLOT_UNAVAILABLE'));
    });

    it('refuses the past, beyond 60 days, a taken slot and the barber himself', async () => {
      await expect(book(ana, joao, '2026-11-02T08:00:00Z')).rejects.toEqual(code('SLOT_IN_PAST'));
      await expect(book(ana, joao, '2027-01-04T17:00:00Z')).rejects.toEqual(
        code('BEYOND_BOOKING_HORIZON'),
      );
      await book(ana, joao, '2026-11-02T17:00:00Z');
      await expect(book(bia, joao, '2026-11-02T17:00:00Z')).rejects.toEqual(
        code('SLOT_UNAVAILABLE'),
      );
      await expect(book(joao.user, joao, '2026-11-02T18:00:00Z')).rejects.toEqual(
        code('BARBER_CANNOT_BOOK_SELF'),
      );
    });

    it('refuses a customer two overlapping appointments with two barbers', async () => {
      await book(ana, joao, '2026-11-02T17:00:00Z');

      await expect(book(ana, jose, '2026-11-02T17:15:00Z')).rejects.toEqual(code('CUSTOMER_BUSY'));
    });

    it('checks the reminder lead', async () => {
      await expect(book(ana, joao, '2026-11-02T17:00:00Z', 7)).rejects.toEqual(
        code('INVALID_REMINDER_LEAD'),
      );
      expect((await book(ana, joao, '2026-11-02T17:00:00Z', null)).reminderLeadMinutes).toBeNull();
    });
  });

  describe('cancel and reschedule', () => {
    it('lets the customer or the barber cancel, and nobody else', async () => {
      const a = await book(ana, joao, '2026-11-02T17:00:00Z');
      await expect(cancelAppointment(deps, bia.id, a.id)).rejects.toEqual(
        code('APPOINTMENT_NOT_FOUND'),
      );

      const canceled = await cancelAppointment(deps, joao.user.id, a.id);

      expect(canceled).toMatchObject({ status: 'canceled', cancelReason: 'barber' });
      expect(deps.events.published.at(-1)?.type).toBe('canceled');
    });

    it('closes the window 2 hours before the start', async () => {
      const a = await book(ana, joao, '2026-11-02T17:00:00Z');
      clock.set('2026-11-02T15:01:00Z'); // 1h59 before

      await expect(cancelAppointment(deps, ana.id, a.id)).rejects.toEqual(
        code('CANCELLATION_WINDOW_CLOSED'),
      );
      await expect(
        rescheduleAppointment(deps, ana.id, a.id, at('2026-11-02T20:00:00Z')),
      ).rejects.toEqual(code('CANCELLATION_WINDOW_CLOSED'));
    });

    it('reschedules in place and keeps the old time when the new one is taken', async () => {
      const a = await book(ana, joao, '2026-11-02T17:00:00Z');
      await book(bia, joao, '2026-11-02T18:00:00Z');

      await expect(
        rescheduleAppointment(deps, ana.id, a.id, at('2026-11-02T18:00:00Z')),
      ).rejects.toEqual(code('SLOT_UNAVAILABLE'));
      expect((await deps.appointments.findById(a.id))?.startsAt).toEqual(
        at('2026-11-02T17:00:00Z'),
      );

      const moved = await rescheduleAppointment(deps, ana.id, a.id, at('2026-11-02T17:15:00Z'));

      expect(moved.id).toBe(a.id);
      expect(moved.startsAt).toEqual(at('2026-11-02T17:15:00Z'));
      expect(deps.events.published.at(-1)).toMatchObject({
        type: 'rescheduled',
        previousStartsAt: at('2026-11-02T17:00:00Z'),
      });
    });
  });

  describe("changes to the barber's agenda", () => {
    it('blocking today keeps appointments less than 2 hours away', async () => {
      clock.set('2026-11-02T09:00:00Z');
      const near = await book(ana, jose, '2026-11-02T11:00:00Z'); // 08:00 local
      const far = await book(bia, jose, '2026-11-02T14:00:00Z'); // 11:00 local
      clock.set('2026-11-02T09:10:00Z'); // 06:10 local

      const canceled = await blockDate(deps, jose.user.id, MONDAY);

      expect(canceled.map((a) => a.id)).toEqual([far.id]);
      expect((await deps.appointments.findById(near.id))?.status).toBe('booked');
      expect((await deps.appointments.findById(far.id))?.cancelReason).toBe('day_blocked');
      expect(await availableSlots(deps, { ...jose, date: MONDAY })).toEqual([]);
    });

    it('refuses to block a date that has passed', async () => {
      await expect(blockDate(deps, jose.user.id, '2026-11-01')).rejects.toEqual(
        code('INVALID_DATE'),
      );
    });

    it('new hours cancel appointments that no longer fit, except the near ones', async () => {
      const near = await book(ana, jose, '2026-11-02T11:00:00Z'); // 08:00 local
      const far = await book(bia, jose, '2026-11-02T18:00:00Z'); // 15:00 local
      clock.set('2026-11-02T09:30:00Z'); // 06:30 local: 08:00 is 1h30 away

      const { canceled } = await setWeeklySchedule(deps, jose.user.id, [
        { weekday: 1, startMinute: h(12), endMinute: h(14) },
      ]);

      expect(canceled.map((a) => a.id)).toEqual([far.id]);
      expect((await deps.appointments.findById(far.id))?.cancelReason).toBe('schedule_changed');
      expect((await deps.appointments.findById(near.id))?.status).toBe('booked');
    });

    it('removing a barber cancels his appointments 2 hours or more away', async () => {
      const near = await book(ana, jose, '2026-11-02T11:00:00Z');
      const far = await book(bia, jose, '2026-11-02T18:00:00Z');
      clock.set('2026-11-02T09:30:00Z');

      const canceled = await cancelFutureForBarber(deps, jose.barberId, jose.user.id);

      expect(canceled.map((a) => a.id)).toEqual([far.id]);
      expect((await deps.appointments.findById(far.id))?.cancelReason).toBe('barber_removed');
      expect((await deps.appointments.findById(near.id))?.status).toBe('booked');
    });
  });

  describe('agendas', () => {
    it('keeps a 22:30 appointment on its local date, though it is the next day in UTC', async () => {
      await setWeeklySchedule(deps, jose.user.id, [
        { weekday: 1, startMinute: h(20), endMinute: h(23) },
      ]);
      const late = await book(bia, jose, '2026-11-03T01:30:00Z'); // 22:30 local on Monday

      const agenda = await barberAgenda(deps, jose.user.id, MONDAY);
      const tuesday = await barberAgenda(deps, jose.user.id, '2026-11-03');

      expect(agenda.map((a) => a.id)).toEqual([late.id]);
      expect(tuesday).toEqual([]);
    });

    it("lists a customer's upcoming appointments in time order", async () => {
      const second = await book(ana, joao, '2026-11-02T20:00:00Z');
      const first = await book(ana, joao, '2026-11-02T17:00:00Z');

      const mine = await myAppointments(deps, ana.id, { upcoming: true });

      expect(mine.map((a) => a.id)).toEqual([first.id, second.id]);
    });

    it('is only for barbers', async () => {
      await expect(barberAgenda(deps, ana.id, MONDAY)).rejects.toEqual(code('NOT_A_BARBER'));
    });
  });
});
