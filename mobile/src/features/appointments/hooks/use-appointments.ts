import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsSignedIn } from '@/features/auth/hooks/use-auth';
import { useApi } from '@/shared/api';
import {
  cancelAppointment,
  fetchMyAppointments,
  fetchRescheduleSlots,
  rescheduleAppointment,
} from '../api/appointments';

const appointmentsKey = ['appointments'] as const;

export function useMyAppointments(upcoming: boolean, enabled = true) {
  const api = useApi();
  const signedIn = useIsSignedIn();
  return useQuery({
    queryKey: [...appointmentsKey, upcoming ? 'upcoming' : 'past'],
    queryFn: () => fetchMyAppointments(api, upcoming),
    enabled: signedIn && enabled,
  });
}

/**
 * One appointment, read from the lists: the API has no query for a single one. Upcoming is
 * looked at first; the past list is fetched only when the id is not there.
 */
export function useAppointment(id: string) {
  const upcoming = useMyAppointments(true);
  const inUpcoming = upcoming.data?.find((a) => a.id === id);
  const past = useMyAppointments(false, upcoming.isSuccess && !inUpcoming);
  const found = inUpcoming ?? past.data?.find((a) => a.id === id);
  const pending = upcoming.isPending || (!inUpcoming && past.isPending && upcoming.isSuccess);
  const error = upcoming.error ?? (inUpcoming ? null : past.error);
  return {
    appointment: found ?? null,
    isPending: !found && pending && !error,
    error,
    refetch: () => Promise.all([upcoming.refetch(), past.refetch()]),
  };
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: appointmentsKey });
    void queryClient.invalidateQueries({ queryKey: ['slots'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
}

export function useCancelAppointment() {
  const api = useApi();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelAppointment(api, id),
    onSettled: invalidate,
  });
}

export function useRescheduleSlots(appointmentId: string, date: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['slots', 'reschedule', appointmentId, date],
    queryFn: () => fetchRescheduleSlots(api, appointmentId, date),
    staleTime: 10_000,
  });
}

export function useReschedule() {
  const api = useApi();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, startsAt }: { id: string; startsAt: string }) =>
      rescheduleAppointment(api, id, startsAt),
    onSettled: invalidate,
  });
}
