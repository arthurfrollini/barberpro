import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteBarber, removeBarber, revokeInvite } from '../api/team';

/** The team lives in the shop query; each change refetches it (awaited, so the list is current). */
function useTeamMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop'] }),
  });
}

export const useInviteBarber = (shopId: string) =>
  useTeamMutation((email: string) => inviteBarber({ shopId, email }));
export const useRevokeInvite = () => useTeamMutation(revokeInvite);
export const useRemoveBarber = () => useTeamMutation(removeBarber);
