// Dates travel as "YYYY-MM-DD" strings in the shop's time zone, as the API expects them;
// instants travel as ISO strings in UTC. These helpers convert between the two with Intl.

const isoDate = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });

const clock = (timeZone: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

/** The local date in a time zone right now (or at `now`). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return isoDate(timeZone).format(now);
}

function utcDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function addDays(date: string, days: number): string {
  const next = utcDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** 0 = Sunday, as the API's weekly schedule counts. */
export function weekdayOf(date: string): number {
  return utcDate(date).getUTCDay();
}

/** "14:00" for an instant, read in the shop's zone. */
export function formatTime(iso: string, timeZone: string): string {
  return clock(timeZone).format(new Date(iso));
}

/** Minutes since local midnight, to place an instant on a day's timeline. */
export function minutesOfDay(iso: string, timeZone: string): number {
  const parts = clock(timeZone).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return get('hour') * 60 + get('minute');
}

const longDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "segunda-feira, 2 de novembro" */
export function formatLongDate(date: string): string {
  return longDate.format(utcDate(date));
}
