import { graphql } from '@/gql';
import type { ApiClient } from '@/shared/api';

const UpdateProfileMutation = graphql(`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
    }
  }
`);

export const updateProfile = async (api: ApiClient, name: string) =>
  (await api.request(UpdateProfileMutation, { input: { name } })).updateProfile;
