import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveWorkspace, workspacesKey } from '@/features/workspaces/hooks/use-workspaces';
import { acceptInvite } from '../api/invites';

/**
 * Resolves only after the workspaces refetch, with the new shop chosen, so the barber pages
 * open on the shop the user just joined.
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { select } = useActiveWorkspace();
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: async (barber) => {
      await queryClient.invalidateQueries({ queryKey: workspacesKey });
      select(barber.barbershop.id);
    },
  });
}
