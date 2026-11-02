import { graphql } from '@/gql';
import type { AgendaChangedSubscription } from '@/gql/graphql';
import { subscribe } from '@/shared/api/subscriptions';

const AgendaChangedSubscriptionDocument = graphql(`
  subscription AgendaChanged($barberId: ID!) {
    agendaChanged(barberId: $barberId) {
      type
      previousStartsAt
      appointment {
        ...AgendaAppointment
      }
    }
  }
`);

export type AgendaChange = AgendaChangedSubscription['agendaChanged'];

export type AgendaWatcher = (
  barberId: string,
  handlers: { next: (change: AgendaChange) => void; reconnected: () => void },
) => () => void;

/** One barber profile's bookings, cancellations and reschedules as they happen. */
export const watchAgenda: AgendaWatcher = (barberId, { next, reconnected }) =>
  subscribe(
    AgendaChangedSubscriptionDocument,
    { barberId },
    { next: (data) => next(data.agendaChanged), reconnected },
  );
