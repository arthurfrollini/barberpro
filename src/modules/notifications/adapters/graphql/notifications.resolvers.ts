import { requireUser } from '../../../../shared/adapters/graphql/context.js';
import type { Resolvers } from '../../../../shared/adapters/graphql/generated/resolvers.js';
import type {
  AgendaChangeMessage,
  AgendaPubSub,
} from '../../../../shared/adapters/graphql/pubsub.js';
import { loadSdl } from '../../../../shared/adapters/graphql/sdl.js';
import type { GraphQLModule } from '../../../../shared/adapters/graphql/yoga.js';
import { ownBarber } from '../../../scheduling/application/lookups.js';
import type { SchedulingDeps } from '../../../scheduling/application/ports.js';
import { listNotifications, markNotificationRead } from '../../application/notifications.js';
import type { NotifyDeps } from '../../application/ports.js';

export function notificationsGraphQL(
  deps: NotifyDeps,
  scheduling: Pick<SchedulingDeps, 'directory'>,
  pubSub: AgendaPubSub,
): GraphQLModule {
  const resolvers: Resolvers = {
    Query: {
      notifications: (_, args, ctx) =>
        listNotifications(deps, requireUser(ctx), {
          limit: args.limit ?? 20,
          offset: args.offset ?? 0,
        }),
      unreadNotificationCount: (_, __, ctx) => deps.notifications.unreadCount(requireUser(ctx)),
    },
    Mutation: {
      markNotificationRead: async (_, { id }, ctx) => {
        await markNotificationRead(deps, requireUser(ctx), id);
        return true;
      },
    },
    Subscription: {
      agendaChanged: {
        // authorization runs once, when the stream opens; then only this barber's topic
        subscribe: async (_, { barberId }, ctx) => {
          const { barber } = await ownBarber(scheduling, requireUser(ctx), barberId);
          return pubSub.subscribe('agendaChanged', barber.id);
        },
        resolve: (message: AgendaChangeMessage) => message,
      },
    },
    Notification: {
      type: (n) => n.type.toUpperCase() as Uppercase<typeof n.type>,
      read: (n) => n.readAt !== null,
      appointment: (n, _, ctx) =>
        n.appointmentId ? ctx.loaders.appointmentById.load(n.appointmentId) : null,
    },
    AgendaChange: {
      type: (m) => m.type.toUpperCase() as Uppercase<typeof m.type>,
      appointment: async (m, _, ctx) => {
        // a subscription keeps one context (and its DataLoaders) for the whole stream, so
        // drop the cached copy: each event must show the appointment as it is now
        const appointment = await ctx.loaders.appointmentById
          .clear(m.appointmentId)
          .load(m.appointmentId);
        if (!appointment)
          throw new Error(`agenda change for a missing appointment ${m.appointmentId}`);
        return appointment;
      },
      previousStartsAt: (m) => (m.previousStartsAt ? new Date(m.previousStartsAt) : null),
    },
  };
  return { typeDefs: loadSdl(import.meta.url, 'notifications.graphql'), resolvers };
}
