import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookAppointmentInput } from '@/gql/graphql';
import { useApi } from '@/shared/api';
import { bookAppointment, fetchSlots } from '../api/booking';

export const slotsKey = ['slots'] as const;

/** Free start times on a day; refreshed often, since anyone may book them. */
export function useSlots(barberId: string, serviceId: string, date: string, enabled: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: [...slotsKey, barberId, serviceId, date],
    queryFn: () => fetchSlots(api, { barberId, serviceId, date }),
    enabled,
    staleTime: 10_000,
  });
}

export function useBook() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookAppointmentInput) => bookAppointment(api, input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: slotsKey });
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
