import { requireUser } from '../../../../shared/adapters/graphql/context.js';
import type { Resolvers } from '../../../../shared/adapters/graphql/generated/resolvers.js';
import { loadSdl } from '../../../../shared/adapters/graphql/sdl.js';
import type { GraphQLModule } from '../../../../shared/adapters/graphql/yoga.js';
import { barberAgenda, myAppointments } from '../../application/agenda.js';
import {
  availableSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from '../../application/booking.js';
import type { SchedulingDeps } from '../../application/ports.js';
import {
  blockDate,
  mySchedule,
  setWeeklySchedule,
  unblockDate,
} from '../../application/schedule.js';
import { formatClockTime, parseClockTime } from './clock-time.js';

type Upper<T extends string> = Uppercase<T>;
const upper = <T extends string>(value: T) => value.toUpperCase() as Upper<T>;

export function schedulingGraphQL(deps: SchedulingDeps): GraphQLModule {
  const resolvers: Resolvers = {
    Query: {
      availableSlots: (_, args) => availableSlots(deps, args),
      myAppointments: (_, { upcoming }, ctx) =>
        myAppointments(deps, requireUser(ctx), { upcoming: upcoming ?? true }),
      barberAgenda: (_, { date }, ctx) => barberAgenda(deps, requireUser(ctx), date),
      mySchedule: (_, __, ctx) => mySchedule(deps, requireUser(ctx)),
    },
    Mutation: {
      setWeeklySchedule: (_, { intervals }, ctx) =>
        setWeeklySchedule(
          deps,
          requireUser(ctx),
          intervals.map((i) => ({
            weekday: i.weekday,
            startMinute: parseClockTime(i.startTime),
            endMinute: parseClockTime(i.endTime),
          })),
        ),
      blockDate: (_, { date }, ctx) => blockDate(deps, requireUser(ctx), date),
      unblockDate: async (_, { date }, ctx) => {
        await unblockDate(deps, requireUser(ctx), date);
        return true;
      },
      bookAppointment: (_, { input }, ctx) =>
        bookAppointment(deps, requireUser(ctx), {
          ...input,
          reminderLeadMinutes: input.reminderLeadMinutes ?? null,
        }),
      cancelAppointment: (_, { id }, ctx) => cancelAppointment(deps, requireUser(ctx), id),
      rescheduleAppointment: (_, { id, startsAt }, ctx) =>
        rescheduleAppointment(deps, requireUser(ctx), id, startsAt),
    },
    Appointment: {
      status: (a) => upper(a.status),
      cancelReason: (a) => (a.cancelReason ? upper(a.cancelReason) : null),
      barber: async (a, _, ctx) => {
        const barber = await ctx.loaders.barberById.load(a.barberId);
        if (!barber) throw new Error(`appointment ${a.id} points to a missing barber`);
        return barber;
      },
      customer: async (a, _, ctx) => {
        const user = await ctx.loaders.userById.load(a.customerId);
        return { id: a.customerId, name: user?.name ?? '' };
      },
    },
    WeeklyInterval: {
      startTime: (i) => formatClockTime(i.startMinute),
      endTime: (i) => formatClockTime(i.endMinute),
    },
    BarberSchedule: {
      weekly: (s) => s.schedule.intervals,
      blockedDates: (s) => [...s.blockedDates].sort(),
    },
    ScheduleUpdate: {
      weekly: (u) => u.schedule.intervals,
      canceledAppointments: (u) => u.canceled,
    },
  };
  return { typeDefs: loadSdl(import.meta.url, 'scheduling.graphql'), resolvers };
}
