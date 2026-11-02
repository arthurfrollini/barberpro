import { graphql } from '@/gql';
import type { AgendaChangedSubscription } from '@/gql/graphql';
import { subscribe } from '@/shared/api/subscriptions';

const AgendaChangedSubscriptionDocument = graphql(`
  subscription AgendaChanged {
    agendaChanged {
      type
      previousStartsAt
      appointment {
        ...AgendaAppointment
      }
    }
  }
`);

export type AgendaChange = AgendaChangedSubscription['agendaChanged'];

export type AgendaWatcher = (handlers: {
  next: (change: AgendaChange) => void;
  reconnected: () => void;
}) => () => void;

/** The signed-in barber's bookings, cancellations and reschedules as they happen. */
export const watchAgenda: AgendaWatcher = ({ next, reconnected }) =>
  subscribe(AgendaChangedSubscriptionDocument, {
    next: (data) => next(data.agendaChanged),
    reconnected,
  });
