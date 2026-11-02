import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesKey } from '@/features/workspaces/hooks/use-workspaces';
import { choose } from '@/features/workspaces/lib/choice';
import { acceptInvite } from '../api/invites';

/**
 * Resolves only after the workspaces refetch, with the new shop chosen, so the barber pages
 * open on the shop the user just joined.
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: async (barber) => {
      await queryClient.invalidateQueries({ queryKey: workspacesKey });
      choose(barber.barbershop.id);
    },
  });
}
