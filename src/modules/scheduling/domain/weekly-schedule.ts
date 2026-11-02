import { DomainError } from '../../../shared/domain/domain-error.js';

/** A working stretch on a weekday, in minutes from local midnight (0 = Sunday). */
export type WeeklyInterval = { weekday: number; startMinute: number; endMinute: number };

const invalid = (message: string) => new DomainError('INVALID_SCHEDULE', message);

function check(i: WeeklyInterval): WeeklyInterval {
  if (!Number.isInteger(i.weekday) || i.weekday < 0 || i.weekday > 6) {
    throw invalid('Weekday must be 0 (Sunday) to 6 (Saturday).');
  }
  const minutes = [i.startMinute, i.endMinute];
  if (minutes.some((m) => !Number.isInteger(m) || m < 0 || m > 1440 || m % 5 !== 0)) {
    throw invalid('Times must be between 00:00 and 24:00, in steps of 5 minutes.');
  }
  if (i.startMinute >= i.endMinute) throw invalid('Each interval must end after it starts.');
  return { weekday: i.weekday, startMinute: i.startMinute, endMinute: i.endMinute };
}

/**
 * A barber's hours: zero or more intervals per weekday. The gap between two intervals is a
 * break, never offered to customers. A weekday with no intervals is a recurring day off.
 */
export class WeeklySchedule {
  private constructor(private readonly byWeekday: WeeklyInterval[][]) {}

  static of(intervals: WeeklyInterval[]): WeeklySchedule {
    const byWeekday: WeeklyInterval[][] = [[], [], [], [], [], [], []];
    for (const interval of intervals.map(check)) byWeekday[interval.weekday]!.push(interval);
    for (const day of byWeekday) {
      day.sort((a, b) => a.startMinute - b.startMinute);
      for (let k = 1; k < day.length; k++) {
        if (day[k]!.startMinute < day[k - 1]!.endMinute) {
          throw invalid('Intervals on the same day cannot overlap.');
        }
      }
    }
    return new WeeklySchedule(byWeekday);
  }

  static empty(): WeeklySchedule {
    return WeeklySchedule.of([]);
  }

  intervalsOn(weekday: number): WeeklyInterval[] {
    return [...(this.byWeekday[weekday] ?? [])];
  }

  get intervals(): WeeklyInterval[] {
    return this.byWeekday.flat();
  }

  /** True when [startMinute, endMinute) sits inside a single interval of that weekday. */
  fits(weekday: number, startMinute: number, endMinute: number): boolean {
    return this.intervalsOn(weekday).some(
      (i) => startMinute >= i.startMinute && endMinute <= i.endMinute,
    );
  }
}
