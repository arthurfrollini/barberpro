import { describe, expect, it } from 'vitest';
import { Appointment } from './appointment.js';
import { availableStarts } from './availability.js';
import { parseReminderLead } from './reminder-lead.js';
import { WeeklySchedule } from './weekly-schedule.js';

const SP = 'America/Sao_Paulo';
const code = (c: string) => expect.objectContaining({ code: c });
const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

// 2026-11-02 is a Monday (weekday 1); São Paulo is UTC-3
const MONDAY = '2026-11-02';
const mondayMorning = new Date('2026-11-02T09:00:00Z'); // 06:00 local

const joao = WeeklySchedule.of([
  { weekday: 1, startMinute: h(10), endMinute: h(12) },
  { weekday: 1, startMinute: h(14), endMinute: h(22) },
]);

describe('WeeklySchedule', () => {
  it('keeps intervals per weekday, sorted', () => {
    const s = WeeklySchedule.of([
      { weekday: 1, startMinute: h(14), endMinute: h(18) },
      { weekday: 1, startMinute: h(8), endMinute: h(12) },
    ]);

    expect(s.intervalsOn(1).map((i) => i.startMinute)).toEqual([h(8), h(14)]);
    expect(s.intervalsOn(0)).toEqual([]);
  });

  it.each([
    [[{ weekday: 1, startMinute: h(12), endMinute: h(10) }], 'end before start'],
    [[{ weekday: 7, startMinute: h(8), endMinute: h(10) }], 'weekday 7'],
    [[{ weekday: 1, startMinute: h(8), endMinute: h(24, 5) }], 'past midnight'],
    [[{ weekday: 1, startMinute: h(8, 3), endMinute: h(10) }], 'not a multiple of 5'],
    [
      [
        { weekday: 1, startMinute: h(8), endMinute: h(12) },
        { weekday: 1, startMinute: h(11), endMinute: h(13) },
      ],
      'overlap',
    ],
  ])('rejects %j (%s)', (intervals) => {
    expect(() => WeeklySchedule.of(intervals)).toThrow(code('INVALID_SCHEDULE'));
  });

  it('accepts back-to-back intervals and a day ending at 24:00', () => {
    expect(() =>
      WeeklySchedule.of([
        { weekday: 1, startMinute: h(8), endMinute: h(12) },
        { weekday: 1, startMinute: h(12), endMinute: h(24) },
      ]),
    ).not.toThrow();
  });

  it('tells whether a stretch of time fits one interval', () => {
    expect(joao.fits(1, h(11, 30), h(12))).toBe(true);
    expect(joao.fits(1, h(11, 45), h(12, 15))).toBe(false);
    expect(joao.fits(2, h(11), h(11, 30))).toBe(false);
  });
});

describe('availableStarts', () => {
  const base = {
    schedule: joao,
    blockedDates: new Set<string>(),
    date: MONDAY,
    timezone: SP,
    durationMinutes: 30,
    busy: [] as { startsAt: Date; endsAt: Date }[],
    now: mondayMorning,
  };

  it('offers every 15 minutes where the whole service fits, skipping the break', () => {
    const starts = iso(availableStarts(base));

    expect(starts[0]).toBe('2026-11-02T13:00:00.000Z'); // 10:00 local
    expect(starts).toContain('2026-11-02T14:30:00.000Z'); // 11:30, ends 12:00
    expect(starts).not.toContain('2026-11-02T14:45:00.000Z'); // 11:45 would end 12:15
    expect(starts).not.toContain('2026-11-02T15:00:00.000Z'); // 12:00 is the break
    expect(starts).toContain('2026-11-02T17:00:00.000Z'); // 14:00
    expect(starts.at(-1)).toBe('2026-11-03T00:30:00.000Z'); // 21:30 local, ends 22:00
    expect(starts).toHaveLength(7 + 31);
  });

  it('refuses a start whose service would run past the interval', () => {
    // interval ends 14:15; a 30-minute service fits at 13:45 but not at 14:00
    const schedule = WeeklySchedule.of([{ weekday: 1, startMinute: h(13), endMinute: h(14, 15) }]);

    const starts = iso(availableStarts({ ...base, schedule }));

    expect(starts).toContain('2026-11-02T16:45:00.000Z');
    expect(starts).not.toContain('2026-11-02T17:00:00.000Z');
  });

  it('drops busy times, past times, blocked dates and dates beyond 60 days', () => {
    const busy = [
      { startsAt: new Date('2026-11-02T13:00:00Z'), endsAt: new Date('2026-11-02T13:30:00Z') },
    ];
    const starts = iso(availableStarts({ ...base, busy }));
    expect(starts).not.toContain('2026-11-02T13:00:00.000Z');
    expect(starts).not.toContain('2026-11-02T12:45:00.000Z');
    expect(starts).toContain('2026-11-02T13:30:00.000Z');

    const later = iso(availableStarts({ ...base, now: new Date('2026-11-02T14:10:00Z') }));
    expect(later[0]).toBe('2026-11-02T14:15:00.000Z');

    expect(availableStarts({ ...base, blockedDates: new Set([MONDAY]) })).toEqual([]);

    const farMonday = '2027-01-04';
    expect(availableStarts({ ...base, date: farMonday })).toEqual([]);
  });

  it('never offers a start that does not exist on the clock (DST gap)', () => {
    // New York, Sunday 2026-03-08: 02:00-03:00 does not exist
    const sunday = WeeklySchedule.of([{ weekday: 0, startMinute: h(1), endMinute: h(5) }]);

    const starts = iso(
      availableStarts({
        ...base,
        schedule: sunday,
        date: '2026-03-08',
        timezone: 'America/New_York',
        now: new Date('2026-03-07T12:00:00Z'),
      }),
    );

    expect(new Set(starts).size).toBe(starts.length);
    expect(starts).toContain('2026-03-08T06:00:00.000Z'); // 01:00 EST
    expect(starts).toContain('2026-03-08T07:00:00.000Z'); // 03:00 EDT
    expect(starts).toContain('2026-03-08T06:45:00.000Z'); // 01:45 EST, the last before the jump
    expect(starts).toHaveLength(4 + 7); // 01:00-01:45, then 03:00-04:30; nothing for 02:xx
  });

  it('is empty on a weekday without hours', () => {
    expect(availableStarts({ ...base, date: '2026-11-01' })).toEqual([]);
  });
});

describe('reminder lead', () => {
  it('accepts null and 5 to 60 in steps of 5', () => {
    expect(parseReminderLead(null)).toBeNull();
    expect(parseReminderLead(5)).toBe(5);
    expect(parseReminderLead(60)).toBe(60);
  });

  it.each([0, 3, 65, 12.5])('rejects %d', (minutes) => {
    expect(() => parseReminderLead(minutes)).toThrow(code('INVALID_REMINDER_LEAD'));
  });
});

describe('Appointment', () => {
  const startsAt = new Date('2026-11-02T17:00:00Z'); // 14:00 local
  const book = () =>
    Appointment.book(
      {
        barberId: 'b',
        customerId: 'c',
        service: { id: 's', name: 'Corte', priceCents: 6000, durationMinutes: 30 },
        startsAt,
        reminderLeadMinutes: 15,
      },
      mondayMorning,
    );
  const minutesBefore = (m: number) => new Date(startsAt.getTime() - m * 60_000);

  it('keeps a snapshot of the service and computes the end', () => {
    const a = book();

    expect(a).toMatchObject({ serviceName: 'Corte', priceCents: 6000, durationMinutes: 30 });
    expect(a.endsAt.toISOString()).toBe('2026-11-02T17:30:00.000Z');
    expect(a.status).toBe('booked');
  });

  it('can be canceled exactly 2 hours before, not 1h59', () => {
    expect(() => book().cancel({ userId: 'c', reason: 'customer' }, minutesBefore(119))).toThrow(
      code('CANCELLATION_WINDOW_CLOSED'),
    );

    const a = book();
    a.cancel({ userId: 'c', reason: 'customer' }, minutesBefore(120));
    expect(a).toMatchObject({ status: 'canceled', cancelReason: 'customer', canceledBy: 'c' });
    expect(() => a.cancel({ userId: 'c', reason: 'customer' }, mondayMorning)).toThrow(
      code('APPOINTMENT_CANCELED'),
    );
  });

  it('reschedules in place under the same rule', () => {
    const a = book();
    const id = a.id;

    a.reschedule(new Date('2026-11-02T19:00:00Z'), mondayMorning);

    expect(a.id).toBe(id);
    expect(a.endsAt.toISOString()).toBe('2026-11-02T19:30:00.000Z');
    expect(() => a.reschedule(startsAt, new Date('2026-11-02T18:00:00Z'))).toThrow(
      code('CANCELLATION_WINDOW_CLOSED'),
    );
  });

  it('is refused in the past', () => {
    expect(() =>
      Appointment.book(
        {
          barberId: 'b',
          customerId: 'c',
          service: { id: 's', name: 'Corte', priceCents: 1, durationMinutes: 30 },
          startsAt: mondayMorning,
          reminderLeadMinutes: null,
        },
        mondayMorning,
      ),
    ).toThrow(code('SLOT_IN_PAST'));
  });
});
