import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../shared/testing/fixed-clock.js';
import { Appointment } from '../../scheduling/domain/appointment.js';
import { fakeNotifyDeps } from '../testing/fakes.js';
import { handleSchedulingEvents } from './handle-events.js';
import { sendReminder } from './reminders.js';

const at = (iso: string) => new Date(iso);
const ANA = 'user-ana';
const JOAO = 'user-joao';

describe('handleSchedulingEvents', () => {
  let clock: FixedClock;
  let deps: ReturnType<typeof fakeNotifyDeps>;

  const appointment = (startsAt = '2026-11-02T17:00:00Z', lead: number | null = 15) =>
    Appointment.book(
      {
        barberId: 'barber-joao',
        customerId: ANA,
        service: { id: 's', name: 'Corte', priceCents: 6000, durationMinutes: 30 },
        startsAt: at(startsAt),
        reminderLeadMinutes: lead,
      },
      clock.now(),
    );

  beforeEach(() => {
    clock = new FixedClock(at('2026-11-02T09:00:00Z'));
    deps = fakeNotifyDeps(clock, {
      users: {
        [ANA]: { name: 'Ana', email: 'ana@x.com' },
        [JOAO]: { name: 'João', email: 'joao@x.com' },
      },
      barbers: { 'barber-joao': { userId: JOAO, timezone: 'America/Sao_Paulo' } },
    });
  });

  it('tells the barber about a new booking, by email too, and schedules the reminder', async () => {
    const a = appointment();

    await handleSchedulingEvents(deps, [{ type: 'booked', appointment: a, byUserId: ANA }]);

    expect(deps.saved).toEqual([
      expect.objectContaining({
        userId: JOAO,
        type: 'appointment_booked',
        title: 'New booking',
        body: 'Ana booked Corte on Mon, Nov 2 at 14:00.',
        appointmentId: a.id,
      }),
    ]);
    expect(deps.mail).toEqual([
      {
        to: 'joao@x.com',
        subject: 'New booking',
        text: 'Ana booked Corte on Mon, Nov 2 at 14:00.',
      },
    ]);
    expect(deps.reminderJobs.get(a.id)).toEqual(at('2026-11-02T16:45:00Z'));
    expect(deps.agendaChanges).toEqual([
      { barberId: 'barber-joao', change: { type: 'booked', appointment: a } },
    ]);
  });

  it('skips a reminder whose time has passed or that the customer did not want', async () => {
    clock.set('2026-11-02T16:50:00Z');
    const soon = appointment('2026-11-02T17:00:00Z', 15);
    const none = appointment('2026-11-02T20:00:00Z', null);

    await handleSchedulingEvents(deps, [
      { type: 'booked', appointment: soon, byUserId: ANA },
      { type: 'booked', appointment: none, byUserId: ANA },
    ]);

    expect(deps.reminderJobs.size).toBe(0);
  });

  it('tells the other party about a cancellation and drops the reminder', async () => {
    const a = appointment();
    deps.reminderJobs.set(a.id, at('2026-11-02T16:45:00Z'));

    a.cancel({ userId: JOAO, reason: 'barber' }, clock.now());
    await handleSchedulingEvents(deps, [{ type: 'canceled', appointment: a, byUserId: JOAO }]);

    expect(deps.saved.map((n) => [n.userId, n.type])).toEqual([[ANA, 'appointment_canceled']]);
    expect(deps.saved[0]!.body).toBe('Your Corte with João on Mon, Nov 2 at 14:00 was canceled.');
    expect(deps.reminderJobs.has(a.id)).toBe(false);
  });

  it('says why when the barber agenda canceled it', async () => {
    const a = appointment();
    a.cancelBySystem('day_blocked', JOAO, clock.now());

    await handleSchedulingEvents(deps, [{ type: 'canceled', appointment: a, byUserId: JOAO }]);

    expect(deps.saved[0]!.body).toBe(
      'Your Corte with João on Mon, Nov 2 at 14:00 was canceled: the barber blocked that day.',
    );
  });

  it('tells the barber when the customer cancels', async () => {
    const a = appointment();
    a.cancel({ userId: ANA, reason: 'customer' }, clock.now());

    await handleSchedulingEvents(deps, [{ type: 'canceled', appointment: a, byUserId: ANA }]);

    expect(deps.saved.map((n) => n.userId)).toEqual([JOAO]);
    expect(deps.saved[0]!.body).toBe('Ana canceled Corte on Mon, Nov 2 at 14:00.');
  });

  it('tells the other party about a reschedule and moves the reminder', async () => {
    const a = appointment();
    const previous = a.startsAt;
    a.reschedule(at('2026-11-02T19:00:00Z'), clock.now());

    await handleSchedulingEvents(deps, [
      { type: 'rescheduled', appointment: a, byUserId: JOAO, previousStartsAt: previous },
    ]);

    expect(deps.saved.map((n) => n.userId)).toEqual([ANA]);
    expect(deps.saved[0]!.body).toBe(
      'Your Corte with João moved from Mon, Nov 2 at 14:00 to Mon, Nov 2 at 16:00.',
    );
    expect(deps.reminderJobs.get(a.id)).toEqual(at('2026-11-02T18:45:00Z'));
  });

  it('still moves the reminder and updates the live agenda when the notification fails', async () => {
    const a = appointment();
    const previous = a.startsAt;
    a.reschedule(at('2026-11-02T19:00:00Z'), clock.now());
    deps.notifications.insert = async () => {
      throw new Error('db down');
    };

    await handleSchedulingEvents(deps, [
      { type: 'rescheduled', appointment: a, byUserId: ANA, previousStartsAt: previous },
    ]);

    expect(deps.errors).toHaveLength(1);
    expect(deps.reminderJobs.get(a.id)).toEqual(at('2026-11-02T18:45:00Z'));
    expect(deps.agendaChanges.map((c) => c.change.type)).toEqual(['rescheduled']);
  });

  it('tells the barber when the customer reschedules', async () => {
    const a = appointment();
    const previous = a.startsAt;
    a.reschedule(at('2026-11-02T19:00:00Z'), clock.now());

    await handleSchedulingEvents(deps, [
      { type: 'rescheduled', appointment: a, byUserId: ANA, previousStartsAt: previous },
    ]);

    expect(deps.saved.map((n) => [n.userId, n.body])).toEqual([
      [JOAO, 'Ana moved Corte from Mon, Nov 2 at 14:00 to Mon, Nov 2 at 16:00.'],
    ]);
  });

  it('logs a failure instead of throwing, and goes on with the next event', async () => {
    const broken = appointment();
    const fine = appointment('2026-11-02T20:00:00Z');
    deps.mailQueue.enqueue = async (m) => {
      if (m.text.includes('14:00')) throw new Error('redis down');
      deps.mail.push(m);
    };

    await handleSchedulingEvents(deps, [
      { type: 'booked', appointment: broken, byUserId: ANA },
      { type: 'booked', appointment: fine, byUserId: ANA },
    ]);

    expect(deps.errors).toHaveLength(1);
    expect(deps.mail).toHaveLength(1);
  });
});

describe('sendReminder', () => {
  let clock: FixedClock;
  let deps: ReturnType<typeof fakeNotifyDeps>;

  beforeEach(() => {
    clock = new FixedClock(at('2026-11-02T09:00:00Z'));
    deps = fakeNotifyDeps(clock, {
      users: {
        [ANA]: { name: 'Ana', email: 'ana@x.com' },
        [JOAO]: { name: 'João', email: 'joao@x.com' },
      },
      barbers: { 'barber-joao': { userId: JOAO, timezone: 'America/Sao_Paulo' } },
    });
  });

  const stored = () => {
    const a = Appointment.book(
      {
        barberId: 'barber-joao',
        customerId: ANA,
        service: { id: 's', name: 'Corte', priceCents: 6000, durationMinutes: 30 },
        startsAt: at('2026-11-02T17:00:00Z'),
        reminderLeadMinutes: 15,
      },
      clock.now(),
    );
    deps.appointmentRows.set(a.id, a);
    return a;
  };

  it('reminds the customer when the time comes', async () => {
    const a = stored();
    clock.set('2026-11-02T16:45:00Z');

    await sendReminder(deps, a.id);

    expect(deps.saved.map((n) => [n.userId, n.type, n.body])).toEqual([
      [ANA, 'appointment_reminder', 'Corte with João at 14:00, in 15 minutes.'],
    ]);
    expect(deps.mail[0]).toMatchObject({ to: 'ana@x.com', subject: 'Reminder: Corte at 14:00' });
  });

  it('sends nothing for a canceled appointment or a job that fires early', async () => {
    const a = stored();
    clock.set('2026-11-02T15:00:00Z'); // the appointment moved and this job is stale
    await sendReminder(deps, a.id);

    a.cancel({ userId: ANA, reason: 'customer' }, clock.now());
    clock.set('2026-11-02T16:45:00Z');
    await sendReminder(deps, a.id);

    expect(deps.saved).toEqual([]);
  });
});
