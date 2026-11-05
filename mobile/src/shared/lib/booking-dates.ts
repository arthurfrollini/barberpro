import { addDays, todayIn, weekdayShort } from '@/shared/lib/time';

/** The API books up to 60 days ahead, counted from the shop's today. */
export const BOOKING_HORIZON_DAYS = 60;

/** The days a customer can pick, in the shop's zone: today and the next 59. */
export function bookingDates(
  timeZone: string,
  now: Date = new Date(),
  count = BOOKING_HORIZON_DAYS,
): string[] {
  const today = todayIn(timeZone, now);
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

/** "hoje", "amanhã", then the short weekday. */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'hoje';
  if (date === addDays(today, 1)) return 'amanhã';
  return weekdayShort(date);
}
