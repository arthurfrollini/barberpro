import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { SignInInput, SignUpInput } from '@/gql/graphql';
import { useApi, useSession, useSessionStore } from '@/shared/api';
import { fetchMe, signIn, signUp, type Me } from '../api/auth';

export const meKey = ['me'] as const;

type AuthPayload = Awaited<ReturnType<typeof signIn>>;

function useStartSession() {
  const queryClient = useQueryClient();
  const store = useSessionStore();
  return ({ user, ...tokens }: AuthPayload) => {
    // whatever was cached belonged to whoever used this phone before
    queryClient.clear();
    store.set(tokens);
    queryClient.setQueryData(meKey, user);
  };
}

export function useSignIn() {
  const api = useApi();
  const start = useStartSession();
  return useMutation({
    mutationFn: (input: SignInInput) => signIn(api, input),
    onSuccess: start,
  });
}

export function useSignUp() {
  const api = useApi();
  const start = useStartSession();
  return useMutation({
    mutationFn: (input: SignUpInput) => signUp(api, input),
    onSuccess: start,
  });
}

export function useMe() {
  const api = useApi();
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: meKey, queryFn: () => fetchMe(api), enabled: signedIn });
}

/** Keeps the cached user in step after the account changes it. */
export function useSetMe() {
  const queryClient = useQueryClient();
  return useCallback((me: Me) => queryClient.setQueryData(meKey, me), [queryClient]);
}

export const useIsSignedIn = () => useSession() !== null;

/** Signing out empties the cache (ApiProvider) and every screen falls back to signed out. */
export function useSignOut() {
  const store = useSessionStore();
  return useCallback(() => store.clear(), [store]);
}
