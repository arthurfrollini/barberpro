import { graphql } from '@/gql';
import type { ApiClient } from '@/shared/api';

const MyAppointmentsQuery = graphql(`
  query MyAppointments($upcoming: Boolean!) {
    myAppointments(upcoming: $upcoming) {
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
      barber {
        id
        name
        avatarUrl
        barbershop {
          id
          name
          address
          timezone
          latitude
          longitude
        }
      }
    }
  }
`);

const CancelAppointmentMutation = graphql(`
  mutation CancelAppointment($id: ID!) {
    cancelAppointment(id: $id) {
      id
      status
      cancelReason
      canceledAt
    }
  }
`);

const RescheduleSlotsQuery = graphql(`
  query RescheduleSlots($appointmentId: ID!, $date: String!) {
    rescheduleSlots(appointmentId: $appointmentId, date: $date)
  }
`);

const RescheduleAppointmentMutation = graphql(`
  mutation RescheduleAppointment($id: ID!, $startsAt: DateTime!) {
    rescheduleAppointment(id: $id, startsAt: $startsAt) {
      id
      startsAt
    }
  }
`);

export const fetchMyAppointments = async (api: ApiClient, upcoming: boolean) =>
  (await api.request(MyAppointmentsQuery, { upcoming })).myAppointments;

export const cancelAppointment = async (api: ApiClient, id: string) =>
  (await api.request(CancelAppointmentMutation, { id })).cancelAppointment;

export const fetchRescheduleSlots = async (api: ApiClient, appointmentId: string, date: string) =>
  (await api.request(RescheduleSlotsQuery, { appointmentId, date })).rescheduleSlots;

export const rescheduleAppointment = async (api: ApiClient, id: string, startsAt: string) =>
  (await api.request(RescheduleAppointmentMutation, { id, startsAt })).rescheduleAppointment;

export type Appointment = Awaited<ReturnType<typeof fetchMyAppointments>>[number];
