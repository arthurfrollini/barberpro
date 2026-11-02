import { describe, expect, it } from 'vitest';
import { addDays, formatLongDate, formatTime, minutesOfDay, todayIn, weekdayOf } from './time';

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
});
