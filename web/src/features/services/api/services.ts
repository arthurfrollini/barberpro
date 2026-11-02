import { graphql } from '@/gql';
import type { CreateServiceInput, UpdateServiceInput } from '@/gql/graphql';
import { api } from '@/shared/api';

graphql(`
  fragment ServiceFields on Service {
    id
    name
    description
    priceCents
    durationMinutes
    archived
  }
`);

const MyServicesQuery = graphql(`
  query MyServices($barberId: ID!) {
    barber(id: $barberId) {
      id
      services {
        ...ServiceFields
      }
    }
  }
`);

const CreateMutation = graphql(`
  mutation CreateService($barberId: ID!, $input: CreateServiceInput!) {
    createService(barberId: $barberId, input: $input) {
      ...ServiceFields
    }
  }
`);

const UpdateMutation = graphql(`
  mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {
    updateService(id: $id, input: $input) {
      ...ServiceFields
    }
  }
`);

const ArchiveMutation = graphql(`
  mutation ArchiveService($id: ID!) {
    archiveService(id: $id) {
      ...ServiceFields
    }
  }
`);

/** One barber profile's bookable services (the API leaves archived ones out). */
export const fetchMyServices = async (barberId: string) =>
  (await api.request(MyServicesQuery, { barberId })).barber?.services ?? [];

export const createService = async ({
  barberId,
  input,
}: {
  barberId: string;
  input: CreateServiceInput;
}) => (await api.request(CreateMutation, { barberId, input })).createService;

export const updateService = async ({ id, input }: { id: string; input: UpdateServiceInput }) =>
  (await api.request(UpdateMutation, { id, input })).updateService;

export const archiveService = async (id: string) =>
  (await api.request(ArchiveMutation, { id })).archiveService;

export type { ServiceFieldsFragment as Service } from '@/gql/graphql';
