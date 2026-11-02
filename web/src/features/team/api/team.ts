import { graphql } from '@/gql';
import { api } from '@/shared/api';

const InviteMutation = graphql(`
  mutation InviteBarber($email: String!) {
    inviteBarber(email: $email) {
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

export const inviteBarber = async (email: string) =>
  (await api.request(InviteMutation, { email })).inviteBarber;

export const revokeInvite = async (id: string) =>
  (await api.request(RevokeMutation, { id })).revokeInvite;

export const removeBarber = async (id: string) =>
  (await api.request(RemoveMutation, { id })).removeBarber;
