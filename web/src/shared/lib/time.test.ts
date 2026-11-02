import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatLongDate,
  formatShortDateTime,
  formatTime,
  isIsoDate,
  localDateOf,
  minutesOfDay,
  todayIn,
  weekdayOf,
} from './time';

const SP = 'America/Sao_Paulo';

describe('time helpers', () => {
  it('todayIn gives the local date in the zone', () => {
    expect(todayIn(SP, new Date('2026-11-02T02:30:00Z'))).toBe('2026-11-01');
    expect(todayIn(SP, new Date('2026-11-02T03:30:00Z'))).toBe('2026-11-02');
  });

  it('addDays crosses months and years', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('weekdayOf counts from Sunday', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(weekdayOf('2026-11-07')).toBe(6);
  });

  it('formatTime and minutesOfDay read an instant in the zone', () => {
    expect(formatTime('2026-11-02T17:00:00.000Z', SP)).toBe('14:00');
    expect(minutesOfDay('2026-11-02T17:00:00.000Z', SP)).toBe(840);
    expect(minutesOfDay('2026-11-02T03:05:00.000Z', SP)).toBe(5);
  });

  it('formatLongDate names the weekday and month in Portuguese', () => {
    expect(formatLongDate('2026-11-02')).toBe('segunda-feira, 2 de novembro');
  });

  it('formatShortDateTime gives weekday, day/month and time in the zone', () => {
    expect(formatShortDateTime('2026-11-02T17:00:00.000Z', SP)).toBe('seg 2/11 às 14:00');
    expect(formatShortDateTime('2026-11-08T02:30:00.000Z', SP)).toBe('sáb 7/11 às 23:30');
  });

  it('localDateOf reads the date of an instant in the zone', () => {
    expect(localDateOf('2026-11-08T02:30:00.000Z', SP)).toBe('2026-11-07');
  });

  it('isIsoDate accepts real calendar dates only', () => {
    expect(isIsoDate('2026-11-02')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-1-2')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});
