import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meKey } from '@/features/auth/hooks/use-auth';
import { workspacesKey } from '@/features/workspaces/hooks/use-workspaces';
import { updateBarberProfile, updateName } from '../api/profile';

export function useUpdateName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateName,
    onSuccess: (me) => {
      queryClient.setQueryData(meKey, me);
      // every barber profile shows the same name
      void queryClient.invalidateQueries({ queryKey: workspacesKey });
    },
  });
}

/** Bio and photo are per shop; the profiles live in the workspaces query, which refetches. */
export function useUpdateBarberProfile(barberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateBarberProfile>[0]['input']) =>
      updateBarberProfile({ barberId, input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
  });
}
