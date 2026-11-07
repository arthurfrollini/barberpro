import { bookingDates, dayLabel } from './booking-dates';

const SP = 'America/Sao_Paulo';

describe('bookingDates', () => {
  it('starts on the shop’s today and covers the 60-day horizon', () => {
    // 01:30 UTC on the 6th is still the 5th in São Paulo
    const dates = bookingDates(SP, new Date('2026-11-06T01:30:00Z'));
    expect(dates).toHaveLength(60);
    expect(dates[0]).toBe('2026-11-05');
    expect(dates[1]).toBe('2026-11-06');
    expect(dates.at(-1)).toBe('2027-01-03');
  });
});

describe('dayLabel', () => {
  it('names today and tomorrow, and the weekday after that', () => {
    expect(dayLabel('2026-11-05', '2026-11-05')).toBe('hoje');
    expect(dayLabel('2026-11-06', '2026-11-05')).toBe('amanhã');
    expect(dayLabel('2026-11-07', '2026-11-05')).toBe('sáb');
  });
});
