import { graphql } from '@/gql';
import { api } from '@/shared/api';

const AcceptInviteMutation = graphql(`
  mutation AcceptInvite($token: String!) {
    acceptInvite(token: $token) {
      id
      barbershop {
        name
      }
    }
  }
`);

export const acceptInvite = async (token: string) =>
  (await api.request(AcceptInviteMutation, { token })).acceptInvite;
