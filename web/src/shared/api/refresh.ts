import { graphql } from '@/gql';

// The one operation outside a feature: the client itself needs it to renew the session.
export const RefreshTokenMutation = graphql(`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) {
      accessToken
      accessTokenExpiresAt
      refreshToken
    }
  }
`);
