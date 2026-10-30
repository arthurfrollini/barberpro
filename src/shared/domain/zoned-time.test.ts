import { describe, expect, it } from 'vitest';
import { addDays, localDate, toLocal, toUtc } from './zoned-time.js';

const SP = 'America/Sao_Paulo';
const NY = 'America/New_York';

describe('zoned time', () => {
  it('turns a São Paulo wall time into UTC', () => {
    expect(toUtc('2026-11-02', 8 * 60, SP).toISOString()).toBe('2026-11-02T11:00:00.000Z');
    expect(toUtc('2026-11-02', 22 * 60 + 30, SP).toISOString()).toBe('2026-11-03T01:30:00.000Z');
  });

  it('reads an instant back as the local date, minute and weekday', () => {
    expect(toLocal(new Date('2026-11-03T01:30:00Z'), SP)).toEqual({
      date: '2026-11-02',
      minuteOfDay: 22 * 60 + 30,
      weekday: 1,
    });
    expect(toLocal(new Date('2026-11-01T15:00:00Z'), SP).weekday).toBe(0);
  });

  it('follows daylight saving time where the zone has it', () => {
    // New York jumps from 02:00 to 03:00 on 2026-03-08
    expect(toUtc('2026-03-07', 9 * 60, NY).toISOString()).toBe('2026-03-07T14:00:00.000Z');
    expect(toUtc('2026-03-09', 9 * 60, NY).toISOString()).toBe('2026-03-09T13:00:00.000Z');
    const instant = toUtc('2026-03-08', 3 * 60 + 30, NY);
    expect(toLocal(instant, NY)).toMatchObject({ date: '2026-03-08', minuteOfDay: 210 });
  });

  it('handles minute 1440 as the end of the day', () => {
    expect(toUtc('2026-11-02', 1440, SP).toISOString()).toBe('2026-11-03T03:00:00.000Z');
  });

  it('validates local dates', () => {
    expect(localDate('2026-11-02')).toBe('2026-11-02');
    for (const bad of ['2026-02-30', '2026-1-2', '02/11/2026', '']) {
      expect(() => localDate(bad)).toThrow(expect.objectContaining({ code: 'INVALID_DATE' }));
    }
  });

  it('adds days across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
});
