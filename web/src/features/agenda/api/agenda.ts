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
  query BarberAgenda($date: String!) {
    barberAgenda(date: $date) {
      ...AgendaAppointment
    }
  }
`);

const MyScheduleQuery = graphql(`
  query MySchedule {
    mySchedule {
      weekly {
        weekday
        startTime
        endTime
      }
      blockedDates
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

export const fetchAgenda = async (date: string) =>
  (await api.request(AgendaQuery, { date })).barberAgenda;

export const fetchMySchedule = async () => (await api.request(MyScheduleQuery)).mySchedule;

export const cancelAppointment = async (id: string) =>
  (await api.request(CancelMutation, { id })).cancelAppointment;

export const rescheduleAppointment = async (id: string, startsAt: string) =>
  (await api.request(RescheduleMutation, { id, startsAt })).rescheduleAppointment;

export const fetchRescheduleSlots = async (id: string, date: string) =>
  (await api.request(RescheduleSlotsQuery, { id, date })).rescheduleSlots;

export type { AgendaAppointmentFragment as AgendaAppointment } from '@/gql/graphql';
export type MySchedule = Awaited<ReturnType<typeof fetchMySchedule>>;
