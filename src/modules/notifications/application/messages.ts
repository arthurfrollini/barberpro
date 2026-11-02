import type { CancelReason } from '../../scheduling/domain/appointment.js';

const formatters = new Map<string, { day: Intl.DateTimeFormat; time: Intl.DateTimeFormat }>();

function formattersFor(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = {
      day: new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    };
    formatters.set(timeZone, f);
  }
  return f;
}

/** "14:00" in the shop's zone. */
export const clockTime = (instant: Date, timeZone: string) =>
  formattersFor(timeZone).time.format(instant);

/** "Mon, Nov 2 at 14:00" in the shop's zone. */
export const when = (instant: Date, timeZone: string) =>
  `${formattersFor(timeZone).day.format(instant)} at ${clockTime(instant, timeZone)}`;

const WHY: Partial<Record<CancelReason, string>> = {
  day_blocked: 'the barber blocked that day',
  schedule_changed: 'the barber changed their hours',
  barber_removed: 'the barber left the shop',
};

export const cancelReasonText = (reason: CancelReason | null) => (reason ? WHY[reason] : undefined);
