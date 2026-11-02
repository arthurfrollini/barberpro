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
  mutation UpdateBarberProfile($input: UpdateBarberProfileInput!) {
    updateBarberProfile(input: $input) {
      id
      bio
      avatarUrl
    }
  }
`);

export const updateName = async (name: string) =>
  (await api.request(UpdateProfileMutation, { input: { name } })).updateProfile;

/** Leave `avatarFileId` out to keep the photo; null removes it. */
export const updateBarberProfile = async (input: UpdateBarberProfileInput) =>
  (await api.request(UpdateBarberProfileMutation, { input })).updateBarberProfile;
