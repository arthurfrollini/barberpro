// Placing a day's appointments on a vertical timeline. Times are minutes since local midnight.

export type TimelineItem = { id: string; start: number; end: number };

/** The shortest block drawn, so a 5-minute service still has room for its name. */
export const MIN_BLOCK_MINUTES = 15;

const DEFAULT = { start: 8 * 60, end: 20 * 60 };

const toMinutes = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return h! * 60 + m!;
};
const floorHour = (minutes: number) => Math.floor(minutes / 60) * 60;
const ceilHour = (minutes: number) => Math.ceil(minutes / 60) * 60;

/**
 * From the first working hour to the last, in whole hours (08:00 to 20:00 on a day off),
 * widened to show any appointment outside them, such as one booked before the hours changed.
 */
export function timelineBounds(
  intervals: { startTime: string; endTime: string }[],
  items: TimelineItem[],
): { start: number; end: number } {
  const starts = [...intervals.map((i) => toMinutes(i.startTime)), ...items.map((i) => i.start)];
  const ends = [...intervals.map((i) => toMinutes(i.endTime)), ...items.map((i) => i.end)];
  const base = intervals.length ? null : DEFAULT;
  const start = Math.min(base?.start ?? Infinity, ...starts);
  const end = Math.max(base?.end ?? -Infinity, ...ends);
  return { start: Math.max(0, floorHour(start)), end: Math.min(1440, ceilHour(end)) };
}

/**
 * Side-by-side columns for items that overlap (a canceled appointment and the booking that
 * took its time). Each run of overlapping items shares one width; a column is reused as soon
 * as its last item ends.
 */
export function layoutColumns(
  items: TimelineItem[],
): Map<string, { column: number; columns: number }> {
  // blocks are drawn at least MIN_BLOCK_MINUTES tall, so they take that much room
  const drawn = items.map((i) => ({ ...i, end: Math.max(i.end, i.start + MIN_BLOCK_MINUTES) }));
  const sorted = drawn.sort((a, b) => a.start - b.start || a.end - b.end);
  const result = new Map<string, { column: number; columns: number }>();
  let group: { id: string; column: number }[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const { id, column } of group) result.set(id, { column, columns: columnEnds.length });
    group = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((end) => end <= item.start);
    if (column === -1) column = columnEnds.push(item.end) - 1;
    else columnEnds[column] = item.end;
    group.push({ id: item.id, column });
    groupEnd = Math.max(groupEnd, item.end);
  }
  closeGroup();
  return result;
}
