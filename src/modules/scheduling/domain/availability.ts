import { toUtc, weekdayOf } from '../../../shared/domain/zoned-time.js';
import type { WeeklySchedule } from './weekly-schedule.js';

export const SLOT_STEP_MINUTES = 15;
export const BOOKING_HORIZON_DAYS = 60;

export type TimeRange = { startsAt: Date; endsAt: Date };

/**
 * The start times a customer may pick on a local date: every 15 minutes from the start of
 * each working interval, as long as the whole service fits before the interval ends. Blocked
 * dates, the past, anything past 60 days and anything overlapping `busy` are left out.
 *
 * Booking validates its start time against this same function, so what the app lists and
 * what the API accepts cannot drift apart.
 */
export function availableStarts(input: {
  schedule: WeeklySchedule;
  blockedDates: ReadonlySet<string>;
  date: string;
  timezone: string;
  durationMinutes: number;
  busy: TimeRange[];
  now: Date;
  stepMinutes?: number;
  horizonDays?: number;
}): Date[] {
  if (input.blockedDates.has(input.date)) return [];
  const step = input.stepMinutes ?? SLOT_STEP_MINUTES;
  const horizon = input.now.getTime() + (input.horizonDays ?? BOOKING_HORIZON_DAYS) * 86_400_000;
  const durationMs = input.durationMinutes * 60_000;

  const starts: Date[] = [];
  for (const interval of input.schedule.intervalsOn(weekdayOf(input.date))) {
    for (let m = interval.startMinute; m + input.durationMinutes <= interval.endMinute; m += step) {
      const startsAt = toUtc(input.date, m, input.timezone);
      const endsAt = new Date(startsAt.getTime() + durationMs);
      if (startsAt <= input.now || startsAt.getTime() > horizon) continue;
      if (input.busy.some((b) => startsAt < b.endsAt && b.startsAt < endsAt)) continue;
      starts.push(startsAt);
    }
  }
  return starts;
}
