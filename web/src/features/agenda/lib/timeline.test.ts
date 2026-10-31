import { describe, expect, it } from 'vitest';
import { layoutColumns, timelineBounds, type TimelineItem } from './timeline';

const hours = (...pairs: [string, string][]) =>
  pairs.map(([startTime, endTime]) => ({ startTime, endTime }));
const item = (id: string, start: number, end: number): TimelineItem => ({ id, start, end });
const h = (hour: number, minute = 0) => hour * 60 + minute;

describe('timelineBounds', () => {
  it('rounds the working hours out to whole hours', () => {
    expect(timelineBounds(hours(['09:30', '18:00']), [])).toEqual({ start: h(9), end: h(18) });
    expect(timelineBounds(hours(['10:00', '12:00'], ['14:00', '21:40']), [])).toEqual({
      start: h(10),
      end: h(22),
    });
  });

  it('shows 08:00 to 20:00 on a day with no hours', () => {
    expect(timelineBounds([], [])).toEqual({ start: h(8), end: h(20) });
  });

  it('grows to show appointments outside the hours', () => {
    expect(timelineBounds(hours(['09:00', '18:00']), [item('a', h(7, 15), h(7, 45))])).toEqual({
      start: h(7),
      end: h(18),
    });
    expect(timelineBounds(hours(['09:00', '18:00']), [item('a', h(23, 30), h(23, 59))])).toEqual({
      start: h(9),
      end: h(24),
    });
  });

  it('reads 24:00 as the end of the day', () => {
    expect(timelineBounds(hours(['18:00', '24:00']), [])).toEqual({ start: h(18), end: h(24) });
  });
});

describe('layoutColumns', () => {
  it('gives items that do not overlap the full width', () => {
    const columns = layoutColumns([item('a', h(10), h(11)), item('b', h(11), h(12))]);
    expect(columns.get('a')).toEqual({ column: 0, columns: 1 });
    expect(columns.get('b')).toEqual({ column: 0, columns: 1 });
  });

  it('puts items at the same time side by side', () => {
    const columns = layoutColumns([
      item('booked', h(14), h(14, 30)),
      item('canceled', h(14), h(14, 30)),
    ]);
    expect(columns.get('booked')).toEqual({ column: 0, columns: 2 });
    expect(columns.get('canceled')).toEqual({ column: 1, columns: 2 });
  });

  it('reuses a column once it is free, within one overlapping group', () => {
    const columns = layoutColumns([
      item('c', h(11, 15), h(12)),
      item('a', h(10), h(11)),
      item('b', h(10, 30), h(11, 30)),
    ]);
    expect(columns.get('a')).toEqual({ column: 0, columns: 2 });
    expect(columns.get('b')).toEqual({ column: 1, columns: 2 });
    expect(columns.get('c')).toEqual({ column: 0, columns: 2 });
  });
});
