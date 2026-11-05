import {
  addDays,
  formatLongDate,
  formatRelative,
  formatShortDate,
  formatShortDateTime,
  formatTime,
  isIsoDate,
  localDateOf,
  todayIn,
  weekdayShort,
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

  it('reads an instant near midnight in the shop zone, not the device zone', () => {
    expect(formatTime('2026-11-06T02:30:00.000Z', SP)).toBe('23:30');
    expect(localDateOf('2026-11-06T02:30:00.000Z', SP)).toBe('2026-11-05');
  });

  it('formatLongDate names the weekday and month in Portuguese', () => {
    expect(formatLongDate('2026-11-02')).toBe('segunda-feira, 2 de novembro');
  });

  it('formatShortDate and weekdayShort are compact', () => {
    expect(formatShortDate('2026-11-06')).toBe('sex 6/11');
    expect(weekdayShort('2026-11-08')).toBe('dom');
  });

  it('formatShortDateTime gives weekday, day/month and time in the zone', () => {
    expect(formatShortDateTime('2026-11-02T17:00:00.000Z', SP)).toBe('seg 2/11 às 14:00');
    expect(formatShortDateTime('2026-11-08T02:30:00.000Z', SP)).toBe('sáb 7/11 às 23:30');
  });

  it('isIsoDate accepts real calendar dates only', () => {
    expect(isIsoDate('2026-11-02')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-1-2')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it('formatRelative counts back from now', () => {
    const now = new Date('2026-11-05T12:00:00Z');
    expect(formatRelative('2026-11-05T11:59:30Z', now)).toBe('agora');
    expect(formatRelative('2026-11-05T11:55:00Z', now)).toBe('há 5 minutos');
    expect(formatRelative('2026-11-04T11:00:00Z', now)).toBe('ontem');
  });
});
