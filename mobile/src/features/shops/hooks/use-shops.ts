import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/api';
import { fetchBarber, fetchShop } from '../api/shops';

export function useShop(id: string) {
  const api = useApi();
  return useQuery({ queryKey: ['shop', id], queryFn: () => fetchShop(api, id) });
}

/** A barber with their shop and bookable services; the booking screen reads it too. */
export function useBarber(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ['barber', id],
    queryFn: () => fetchBarber(api, id!),
    enabled: Boolean(id),
  });
}
