import { graphql } from '@/gql';
import type { UpdateBarberProfileInput } from '@/gql/graphql';
import { api } from '@/shared/api';

const UpdateProfileMutation = graphql(`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
    }
  }
`);

const UpdateBarberProfileMutation = graphql(`
  mutation UpdateBarberProfile($barberId: ID!, $input: UpdateBarberProfileInput!) {
    updateBarberProfile(barberId: $barberId, input: $input) {
      id
      bio
      avatarUrl
    }
  }
`);

export const updateName = async (name: string) =>
  (await api.request(UpdateProfileMutation, { input: { name } })).updateProfile;

/** Leave `avatarFileId` out to keep the photo; null removes it. */
export const updateBarberProfile = async ({
  barberId,
  input,
}: {
  barberId: string;
  input: UpdateBarberProfileInput;
}) => (await api.request(UpdateBarberProfileMutation, { barberId, input })).updateBarberProfile;
