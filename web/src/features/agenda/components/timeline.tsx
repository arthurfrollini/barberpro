import { formatBRL } from '@/shared/lib/money';
import { formatTime, minutesOfDay } from '@/shared/lib/time';
import { cn } from '@/shared/lib/utils';
import type { AgendaAppointment } from '../api/agenda';
import { layoutColumns, timelineBounds } from '../lib/timeline';

const PX_PER_MINUTE = 1.4; // 84 px an hour: a 15-minute booking still fits a line of text

type Props = {
  appointments: AgendaAppointment[];
  hours: { startTime: string; endTime: string }[];
  timeZone: string;
  /** Minutes since local midnight, when the day shown is today. */
  nowMinute: number | null;
  onSelect: (id: string) => void;
};

const toMinutes = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return h! * 60 + m!;
};

/** The day as a barber's appointment book: hours down the left, bookings sized by length. */
export function Timeline({ appointments, hours, timeZone, nowMinute, onSelect }: Props) {
  const items = appointments.map((a) => {
    const start = minutesOfDay(a.startsAt, timeZone);
    // an appointment that ends at midnight reads as 00:00; keep it on this day
    return { id: a.id, start, end: start + a.durationMinutes };
  });
  const bounds = timelineBounds(hours, items);
  const columns = layoutColumns(items);
  const top = (minute: number) => (minute - bounds.start) * PX_PER_MINUTE;
  const hourMarks = Array.from(
    { length: (bounds.end - bounds.start) / 60 + 1 },
    (_, i) => bounds.start + i * 60,
  );

  return (
    <div className="relative flex" style={{ height: top(bounds.end) + 12 }}>
      <div aria-hidden className="relative w-16 shrink-0">
        {hourMarks.map((minute) => (
          <div
            key={minute}
            className="absolute right-3 -translate-y-1/2 leading-none"
            style={{ top: top(minute) }}
          >
            <span className="font-display text-xl text-foreground/90">
              {String(minute / 60).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground">:00</span>
          </div>
        ))}
      </div>

      <div className="relative flex-1">
        {/* working hours are lighter than the rest of the day */}
        {hours.map((interval) => (
          <div
            key={interval.startTime}
            aria-hidden
            className="absolute inset-x-0 rounded-sm bg-card/35"
            style={{
              top: top(toMinutes(interval.startTime)),
              height: (toMinutes(interval.endTime) - toMinutes(interval.startTime)) * PX_PER_MINUTE,
            }}
          />
        ))}
        {hourMarks.map((minute) => (
          <div
            key={minute}
            aria-hidden
            className="absolute inset-x-0 border-t border-border/60"
            style={{ top: top(minute) }}
          />
        ))}

        <ol aria-label="Agendamentos do dia" className="absolute inset-0">
          {appointments.map((a, i) => {
            const item = items[i]!;
            const { column, columns: count } = columns.get(a.id)!;
            const canceled = a.status === 'CANCELED';
            const time = formatTime(a.startsAt, timeZone);
            const height = Math.max(item.end - item.start, 15) * PX_PER_MINUTE - 3;
            // short blocks keep everything on one line
            const tall = height > 44;
            const detail = canceled ? 'Cancelado' : `${a.serviceName}, ${formatBRL(a.priceCents)}`;
            return (
              <li
                key={a.id}
                className="absolute px-0.5"
                style={{
                  top: top(item.start) + 1.5,
                  height,
                  left: `${(column / count) * 100}%`,
                  width: `${100 / count}%`,
                }}
              >
                <button
                  type="button"
                  aria-label={`${time} ${a.customer.name}, ${a.serviceName}${canceled ? ', cancelado' : ''}`}
                  onClick={() => onSelect(a.id)}
                  className={cn(
                    'flex size-full flex-col items-start overflow-hidden rounded-md border-l-4 px-3 py-1.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    canceled
                      ? 'border-muted-foreground/40 bg-muted/60 text-muted-foreground hover:bg-muted'
                      : 'border-primary bg-card hover:bg-accent',
                  )}
                >
                  <span className="flex w-full items-baseline gap-2">
                    <span className="font-display font-semibold tabular-nums">{time}</span>
                    <span className={cn('truncate font-medium', canceled && 'line-through')}>
                      {a.customer.name}
                    </span>
                    {!tall && (
                      <span className="truncate text-xs text-muted-foreground">{detail}</span>
                    )}
                  </span>
                  {tall && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
                </button>
              </li>
            );
          })}
        </ol>

        {nowMinute !== null && nowMinute >= bounds.start && nowMinute <= bounds.end && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ top: top(nowMinute) - 4 }}
          >
            <span className="size-2 -translate-x-1 rounded-full bg-primary" />
            <span className="h-0.5 flex-1 bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
