import { DomainError } from './domain-error.js';

// Weekly hours and days off are wall-clock times in the shop's zone; instants are UTC.
// These helpers convert between the two with Intl, which knows each zone's DST rules.

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function wallClock(instant: Date, timeZone: string) {
  const p = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    minuteOfDay: Number(p.hour) * 60 + Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS[p.weekday!]!,
  };
}

/** Minutes the zone is ahead of UTC at that instant (São Paulo: -180). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, 0, w.minuteOfDay, w.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** Validates a calendar date written as YYYY-MM-DD. */
export function localDate(value: string): string {
  const m = DATE.exec(value);
  const ok =
    m &&
    (() => {
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      return d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
    })();
  if (!ok) throw new DomainError('INVALID_DATE', 'Use a real date written as YYYY-MM-DD.');
  return value;
}

/**
 * The instant when the clock in `timeZone` shows `date` at `minuteOfDay` (0 to 1440).
 * Around a DST change, like Temporal's "compatible" mode: a repeated wall time gives the
 * first instant, and a wall time that does not exist moves forward by the gap.
 */
export function toUtc(date: string, minuteOfDay: number, timeZone: string): Date {
  const day = addDays(date, Math.floor(minuteOfDay / 1440));
  const minute = minuteOfDay % 1440;
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const wall = Date.UTC(y, m - 1, d, 0, minute);
  // the offsets in force half a day before and after cover any single transition
  const candidates = [
    ...new Set([-12, 12].map((h) => offsetMinutes(new Date(wall + h * 3_600_000), timeZone))),
  ]
    .map((offset) => wall - offset * 60_000)
    .sort((a, b) => a - b);
  const exact = candidates.filter((t) => {
    const local = toLocal(new Date(t), timeZone);
    return local.date === day && local.minuteOfDay === minute;
  });
  return new Date(exact.length > 0 ? exact[0]! : candidates.at(-1)!);
}

/** What a clock in `timeZone` shows at `instant`. Weekday 0 is Sunday. */
export function toLocal(
  instant: Date,
  timeZone: string,
): { date: string; minuteOfDay: number; weekday: number } {
  const w = wallClock(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${w.year}-${pad(w.month)}-${pad(w.day)}`,
    minuteOfDay: w.minuteOfDay,
    weekday: w.weekday,
  };
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = localDate(date).split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = localDate(date).split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
