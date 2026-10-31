import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesKey } from '@/features/roles/hooks/use-roles';
import { becomeBarber, createShop, fetchMyShop, updateShop } from '../api/shop';

export const shopKey = ['shop'] as const;

export function useMyShop() {
  return useQuery({ queryKey: shopKey, queryFn: fetchMyShop });
}

/** Creating, editing or joining the shop changes what the user is: roles refetch too. */
function useShopMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: shopKey }),
        queryClient.invalidateQueries({ queryKey: rolesKey }),
      ]),
  });
}

export const useCreateShop = () => useShopMutation(createShop);
export const useUpdateShop = () => useShopMutation(updateShop);
export const useBecomeBarber = () => useShopMutation(becomeBarber);
