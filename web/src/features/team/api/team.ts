import { graphql } from '@/gql';
import { api } from '@/shared/api';

const InviteMutation = graphql(`
  mutation InviteBarber($shopId: ID!, $email: String!) {
    inviteBarber(shopId: $shopId, email: $email) {
      id
      email
      status
      expiresAt
      createdAt
    }
  }
`);

const RevokeMutation = graphql(`
  mutation RevokeInvite($id: ID!) {
    revokeInvite(id: $id) {
      id
      status
    }
  }
`);

const RemoveMutation = graphql(`
  mutation RemoveBarber($id: ID!) {
    removeBarber(id: $id) {
      id
    }
  }
`);

export const inviteBarber = async ({ shopId, email }: { shopId: string; email: string }) =>
  (await api.request(InviteMutation, { shopId, email })).inviteBarber;

export const revokeInvite = async (id: string) =>
  (await api.request(RevokeMutation, { id })).revokeInvite;

export const removeBarber = async (id: string) =>
  (await api.request(RemoveMutation, { id })).removeBarber;
