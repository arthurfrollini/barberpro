import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { formatShortDateTime } from '@/shared/lib/time';
import { watchAgenda, type AgendaChange, type AgendaWatcher } from '../api/live';
import { wasChangedHere } from '../lib/changed-here';
import { agendaKeys } from './use-agenda';

function describe(change: AgendaChange, timeZone: string): string {
  const { customer, startsAt } = change.appointment;
  const when = formatShortDateTime(startsAt, timeZone);
  switch (change.type) {
    case 'BOOKED':
      return `Novo agendamento: ${customer.name}, ${when}`;
    case 'CANCELED':
      return `Agendamento cancelado: ${customer.name}, ${when}`;
    case 'RESCHEDULED':
      // the event does not say who moved it: the customer, or the barber in another tab
      return `Agendamento remarcado: ${customer.name}, ${when}`;
  }
}

/**
 * Keeps the agenda current while it is open: each change refetches the agenda and the
 * notifications (the server is the source of truth, the event only says "look again") and
 * shows what happened. After a dropped connection it refetches once, without toasts for
 * whatever happened while offline.
 */
export function useAgendaLive(timeZone: string, watch: AgendaWatcher = watchAgenda) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: agendaKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // a slot offered for a move may just have been taken
      void queryClient.invalidateQueries({ queryKey: ['reschedule-slots'] });
    };
    return watch({
      next: (change) => {
        refresh();
        if (!wasChangedHere(change.appointment.id)) toast(describe(change, timeZone));
      },
      reconnected: refresh,
    });
  }, [queryClient, timeZone, watch]);
}
