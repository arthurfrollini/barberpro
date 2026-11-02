import { z } from 'zod';

/** Monday first, as Brazilian shops think of the week; the API numbers days from Sunday = 0. */
export const WEEK = [
  { weekday: 1, name: 'Segunda' },
  { weekday: 2, name: 'Terça' },
  { weekday: 3, name: 'Quarta' },
  { weekday: 4, name: 'Quinta' },
  { weekday: 5, name: 'Sexta' },
  { weekday: 6, name: 'Sábado' },
  { weekday: 0, name: 'Domingo' },
] as const;

export const dayName = (weekday: number) => WEEK.find((d) => d.weekday === weekday)!.name;

type WeeklyInterval = { weekday: number; startTime: string; endTime: string };

const CLOCK = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

const time = z
  .string()
  .regex(CLOCK, { message: 'Use o formato 09:00', abort: true })
  .refine((clock) => minutes(clock) % 5 === 0, 'Use minutos de 5 em 5');

const wellFormed = (clock: string) => CLOCK.test(clock) && minutes(clock) % 5 === 0;

const intervalSchema = z
  .object({ start: time, end: time })
  // only compare times that are valid on their own
  .refine((i) => !wellFormed(i.start) || !wellFormed(i.end) || minutes(i.end) > minutes(i.start), {
    message: 'O fim vem depois do início',
    path: ['end'],
  });

const daySchema = z.object({
  weekday: z.number(),
  working: z.boolean(),
  intervals: z.array(z.object({ start: z.string(), end: z.string() })),
});

/**
 * The same rules as the API's INVALID_SCHEDULE, said per field. A day off keeps whatever its
 * fields hold (so switching it back on restores them) and is not checked.
 */
export const weekSchema = z.object({ days: z.array(daySchema) }).superRefine(({ days }, ctx) => {
  days.forEach((day, d) => {
    if (!day.working) return;
    day.intervals.forEach((interval, i) => {
      const result = intervalSchema.safeParse(interval);
      result.error?.issues.forEach((issue) =>
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: ['days', d, 'intervals', i, ...issue.path],
        }),
      );
    });
    const valid = day.intervals
      .map((interval, i) => ({ ...interval, i }))
      .filter((interval) => intervalSchema.safeParse(interval).success)
      .sort((a, b) => minutes(a.start) - minutes(b.start));
    for (let k = 1; k < valid.length; k++) {
      if (minutes(valid[k]!.start) < minutes(valid[k - 1]!.end)) {
        ctx.addIssue({
          code: 'custom',
          message: `Os intervalos de ${dayName(day.weekday).toLowerCase()} se sobrepõem`,
          path: ['days', d, 'intervals', valid[k]!.i, 'start'],
        });
        break;
      }
    }
  });
});

export type WeekForm = z.infer<typeof weekSchema>;

export function toForm(weekly: WeeklyInterval[]): WeekForm {
  return {
    days: WEEK.map(({ weekday }) => {
      const intervals = weekly
        .filter((i) => i.weekday === weekday)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((i) => ({ start: i.startTime, end: i.endTime }));
      return { weekday, working: intervals.length > 0, intervals };
    }),
  };
}

export function fromForm(form: WeekForm): WeeklyInterval[] {
  return form.days.flatMap((day) =>
    day.working
      ? day.intervals.map((i) => ({ weekday: day.weekday, startTime: i.start, endTime: i.end }))
      : [],
  );
}
