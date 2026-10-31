import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { session } from '@/shared/api';
import { fetchMe, signIn, signUp } from '../api/auth';

export const meKey = ['me'] as const;

type AuthPayload = Awaited<ReturnType<typeof signIn>>;

function startSession(queryClient: QueryClient, { user, ...tokens }: AuthPayload) {
  // whatever was cached belonged to whoever used this browser before
  queryClient.clear();
  session.set(tokens);
  queryClient.setQueryData(meKey, user);
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signIn,
    onSuccess: (payload) => startSession(queryClient, payload),
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signUp,
    onSuccess: (payload) => startSession(queryClient, payload),
  });
}

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: fetchMe });
}

/** True while a session is stored; follows sign-ins and sign-outs in other tabs too. */
export function useIsSignedIn() {
  return useSyncExternalStore(session.subscribe, () => session.get() !== null);
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(() => {
    session.clear({ onPurpose: true });
    queryClient.clear();
    navigate('/entrar', { replace: true });
  }, [navigate, queryClient]);
}
