import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meKey } from '@/features/auth/hooks/use-auth';
import { rolesKey } from '@/features/roles/hooks/use-roles';
import { updateBarberProfile, updateName } from '../api/profile';

export function useUpdateName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateName,
    onSuccess: (me) => queryClient.setQueryData(meKey, me),
  });
}

/** The barber profile lives in the roles query (sidebar, agenda), so that one refetches. */
export function useUpdateBarberProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBarberProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey }),
  });
}
