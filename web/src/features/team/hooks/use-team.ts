import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shopKey } from '@/features/shop/hooks/use-shop';
import { inviteBarber, removeBarber, revokeInvite } from '../api/team';

/** The team lives in the shop query; each change refetches it (awaited, so the list is current). */
function useTeamMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopKey }),
  });
}

export const useInviteBarber = () => useTeamMutation(inviteBarber);
export const useRevokeInvite = () => useTeamMutation(revokeInvite);
export const useRemoveBarber = () => useTeamMutation(removeBarber);
