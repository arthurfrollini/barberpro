import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspacesKey } from '@/features/workspaces/hooks/use-workspaces';
import { becomeBarber, createShop, fetchMyShop, updateShop } from '../api/shop';

export const shopKey = (shopId: string) => ['shop', shopId] as const;

export function useMyShop(shopId: string) {
  return useQuery({ queryKey: shopKey(shopId), queryFn: () => fetchMyShop(shopId) });
}

/**
 * Creating, editing or joining a shop changes the user's workspaces (names, logos, roles):
 * the mutation resolves only after they refetch, so the next screen sees the new state.
 */
function useShopMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop'] }),
        queryClient.invalidateQueries({ queryKey: workspacesKey }),
      ]),
  });
}

export const useCreateShop = () => useShopMutation(createShop);
export const useUpdateShop = () => useShopMutation(updateShop);
export const useBecomeBarber = () => useShopMutation(becomeBarber);
