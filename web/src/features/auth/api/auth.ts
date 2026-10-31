import { graphql } from '@/gql';
import type { SignInInput, SignUpInput } from '@/gql/graphql';
import { api } from '@/shared/api';

const SignInMutation = graphql(`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      accessTokenExpiresAt
      refreshToken
      user {
        id
        name
        email
      }
    }
  }
`);

const SignUpMutation = graphql(`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      accessToken
      accessTokenExpiresAt
      refreshToken
      user {
        id
        name
        email
      }
    }
  }
`);

const MeQuery = graphql(`
  query Me {
    me {
      id
      name
      email
    }
  }
`);

export const signIn = async (input: SignInInput) =>
  (await api.request(SignInMutation, { input })).signIn;

export const signUp = async (input: SignUpInput) =>
  (await api.request(SignUpMutation, { input })).signUp;

export const fetchMe = async () => (await api.request(MeQuery)).me;

export type Me = Awaited<ReturnType<typeof fetchMe>>;
