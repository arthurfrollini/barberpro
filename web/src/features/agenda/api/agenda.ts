import { graphql } from '@/gql';
import { api } from '@/shared/api';

graphql(`
  fragment AgendaAppointment on Appointment {
    id
    startsAt
    endsAt
    status
    serviceName
    priceCents
    durationMinutes
    reminderLeadMinutes
    cancelReason
    canceledAt
    customer {
      id
      name
    }
  }
`);

const AgendaQuery = graphql(`
  query BarberAgenda($barberId: ID!, $date: String!) {
    barberAgenda(barberId: $barberId, date: $date) {
      ...AgendaAppointment
    }
  }
`);

const CancelMutation = graphql(`
  mutation CancelAppointment($id: ID!) {
    cancelAppointment(id: $id) {
      ...AgendaAppointment
    }
  }
`);

const RescheduleMutation = graphql(`
  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {
    rescheduleAppointment(id: $id, startsAt: $startsAt) {
      ...AgendaAppointment
    }
  }
`);

const RescheduleSlotsQuery = graphql(`
  query RescheduleSlots($id: ID!, $date: String!) {
    rescheduleSlots(appointmentId: $id, date: $date)
  }
`);

export const fetchAgenda = async (barberId: string, date: string) =>
  (await api.request(AgendaQuery, { barberId, date })).barberAgenda;

export const cancelAppointment = async (id: string) =>
  (await api.request(CancelMutation, { id })).cancelAppointment;

export const rescheduleAppointment = async (id: string, startsAt: string) =>
  (await api.request(RescheduleMutation, { id, startsAt })).rescheduleAppointment;

export const fetchRescheduleSlots = async (id: string, date: string) =>
  (await api.request(RescheduleSlotsQuery, { id, date })).rescheduleSlots;

export type { AgendaAppointmentFragment as AgendaAppointment } from '@/gql/graphql';
