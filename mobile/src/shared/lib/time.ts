// Dates travel as "YYYY-MM-DD" strings in the shop's time zone, as the API expects them;
// instants travel as ISO strings in UTC. These helpers convert between the two with Intl,
// so what the customer sees is the shop's clock, wherever the phone is.

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

/** "14:00" for an instant, read in the shop's zone. */
export function formatTime(iso: string, timeZone: string): string {
  return clock(timeZone).format(new Date(iso));
}

/** The local date ("YYYY-MM-DD") of an instant in a zone. */
export function localDateOf(iso: string, timeZone: string): string {
  return isoDate(timeZone).format(new Date(iso));
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

const shortWeekday = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' });

/** "sex" */
export function weekdayShort(date: string): string {
  return shortWeekday.format(utcDate(date)).replace('.', '');
}

/** "sex 6/11" */
export function formatShortDate(date: string): string {
  const d = utcDate(date);
  return `${weekdayShort(date)} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** "seg 2/11 às 14:00", read in the shop's zone. */
export function formatShortDateTime(iso: string, timeZone: string): string {
  return `${formatShortDate(localDateOf(iso, timeZone))} às ${formatTime(iso, timeZone)}`;
}

/** A real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDays(value, 0) === value;
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "agora", "há 5 minutos", "há 2 horas", "ontem", "há 3 dias", then the date. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - Date.parse(iso)) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute');
  if (seconds < 86_400) return relative.format(-Math.floor(seconds / 3600), 'hour');
  const days = Math.floor(seconds / 86_400);
  if (days < 7) return relative.format(-days, 'day');
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(iso));
}
