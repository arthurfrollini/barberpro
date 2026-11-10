import { graphql } from '@/gql';
import type { PushPlatform } from '@/gql/graphql';
import type { ApiClient } from '@/shared/api';

const RegisterPushTokenMutation = graphql(`
  mutation RegisterPushToken($token: String!, $platform: PushPlatform!) {
    registerPushToken(token: $token, platform: $platform)
  }
`);

const UnregisterPushTokenMutation = graphql(`
  mutation UnregisterPushToken($token: String!) {
    unregisterPushToken(token: $token)
  }
`);

export const registerPushToken = async (api: ApiClient, token: string, platform: PushPlatform) =>
  (await api.request(RegisterPushTokenMutation, { token, platform })).registerPushToken;

export const unregisterPushToken = async (api: ApiClient, token: string) =>
  (await api.request(UnregisterPushTokenMutation, { token })).unregisterPushToken;
