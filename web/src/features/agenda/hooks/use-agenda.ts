import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  cancelAppointment,
  fetchAgenda,
  fetchRescheduleSlots,
  rescheduleAppointment,
  type AgendaAppointment,
} from '../api/agenda';
import { localDateOf } from '@/shared/lib/time';
import { forgetChangedHere, markChangedHere } from '../lib/changed-here';

export const agendaKeys = {
  all: ['agenda'] as const,
  day: (date: string) => ['agenda', date] as const,
};

export function useAgenda(date: string) {
  return useQuery({ queryKey: agendaKeys.day(date), queryFn: () => fetchAgenda(date) });
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
 * The changed appointment replaces its old copy at once, so the screen reacts before the
 * refetch: in its own day, and out of any other cached day (a move can leave one day for
 * another). Then every day refetches, and the notifications too (the customer was told).
 */
function applyChange(queryClient: QueryClient, changed: AgendaAppointment, timeZone: string) {
  const day = localDateOf(changed.startsAt, timeZone);
  for (const [key, list] of queryClient.getQueriesData<AgendaAppointment[]>({
    queryKey: agendaKeys.all,
  })) {
    if (!list) continue;
    const others = list.filter((a) => a.id !== changed.id);
    const here = key[1] === day && list.some((a) => a.id === changed.id);
    queryClient.setQueryData(
      key,
      here ? list.map((a) => (a.id === changed.id ? changed : a)) : others,
    );
  }
  void queryClient.invalidateQueries({ queryKey: agendaKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

/** A refused change means the screen was out of date (canceled elsewhere, 2 hours passed). */
function refreshAfterFailure(queryClient: QueryClient, id: string) {
  forgetChangedHere(id);
  void queryClient.invalidateQueries({ queryKey: agendaKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['reschedule-slots'] });
}

export function useCancelAppointment(timeZone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAppointment,
    // marked before the request: the live echo can arrive before the response
    onMutate: (id) => markChangedHere(id),
    onSuccess: (changed) => applyChange(queryClient, changed, timeZone),
    onError: (_error, id) => refreshAfterFailure(queryClient, id),
  });
}

export function useRescheduleAppointment(timeZone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startsAt }: { id: string; startsAt: string }) =>
      rescheduleAppointment(id, startsAt),
    onMutate: ({ id }) => markChangedHere(id),
    onSuccess: (changed) => applyChange(queryClient, changed, timeZone),
    onError: (_error, { id }) => refreshAfterFailure(queryClient, id),
  });
}
