import { graphql } from '@/gql';
import type { BookAppointmentInput } from '@/gql/graphql';
import type { ApiClient } from '@/shared/api';

const AvailableSlotsQuery = graphql(`
  query AvailableSlots($barberId: ID!, $serviceId: ID!, $date: String!) {
    availableSlots(barberId: $barberId, serviceId: $serviceId, date: $date)
  }
`);

const BookAppointmentMutation = graphql(`
  mutation BookAppointment($input: BookAppointmentInput!) {
    bookAppointment(input: $input) {
      id
    }
  }
`);

export const fetchSlots = async (
  api: ApiClient,
  vars: { barberId: string; serviceId: string; date: string },
) => (await api.request(AvailableSlotsQuery, vars)).availableSlots;

export const bookAppointment = async (api: ApiClient, input: BookAppointmentInput) =>
  (await api.request(BookAppointmentMutation, { input })).bookAppointment;
