import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  cancelAppointment,
  fetchAgenda,
  fetchMySchedule,
  fetchRescheduleSlots,
  rescheduleAppointment,
  type AgendaAppointment,
} from '../api/agenda';
import { markChangedHere } from '../lib/changed-here';

export const agendaKeys = {
  all: ['agenda'] as const,
  day: (date: string) => ['agenda', date] as const,
};

export const scheduleKey = ['schedule'] as const;

export function useAgenda(date: string) {
  return useQuery({ queryKey: agendaKeys.day(date), queryFn: () => fetchAgenda(date) });
}

export function useMySchedule() {
  return useQuery({ queryKey: scheduleKey, queryFn: fetchMySchedule });
}

export function useRescheduleSlots(id: string, date: string | null) {
  return useQuery({
    queryKey: ['reschedule-slots', id, date],
    queryFn: () => fetchRescheduleSlots(id, date!),
    enabled: date !== null,
    staleTime: 0,
  });
}

/**
 * The changed appointment replaces its old copy in every cached day at once, so the screen
 * reacts before the refetch; then every day refetches, since a move can leave one day and
 * land on another. Notifications change too (the customer was told).
 */
function applyChange(queryClient: QueryClient, changed: AgendaAppointment) {
  markChangedHere(changed.id);
  queryClient.setQueriesData<AgendaAppointment[]>({ queryKey: agendaKeys.all }, (day) =>
    day?.map((a) => (a.id === changed.id ? changed : a)),
  );
  void queryClient.invalidateQueries({ queryKey: agendaKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: (changed) => applyChange(queryClient, changed),
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startsAt }: { id: string; startsAt: string }) =>
      rescheduleAppointment(id, startsAt),
    onSuccess: (changed) => applyChange(queryClient, changed),
  });
}
