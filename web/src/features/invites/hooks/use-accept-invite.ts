import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesKey } from '@/features/roles/hooks/use-roles';
import { acceptInvite } from '../api/invites';

/** Resolves only after the roles refetch, so the barber pages let the new barber in. */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey }),
  });
}
