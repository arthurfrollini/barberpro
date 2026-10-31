import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { currentShop, useRoles } from '@/features/roles/hooks/use-roles';
import { useNow } from '@/shared/hooks/use-now';
import { formatBRL } from '@/shared/lib/money';
import { formatLongDate, isIsoDate, minutesOfDay, todayIn, weekdayOf } from '@/shared/lib/time';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';
import { AppointmentSheet } from '../components/appointment-sheet';
import { DayToolbar } from '../components/day-toolbar';
import { Timeline } from '../components/timeline';
import { useAgenda, useMySchedule } from '../hooks/use-agenda';
import { useAgendaLive } from '../hooks/use-agenda-live';
import { appointmentsCount, capitalize } from '../lib/labels';

export function AgendaPage() {
  const roles = useRoles();
  // RequireRole('barber') guarantees a shop here
  const timeZone = currentShop(roles.data!)!.timezone;
  useAgendaLive(timeZone);
  const now = useNow();
  const today = todayIn(timeZone, now);
  const [search, setSearch] = useSearchParams();
  const requested = search.get('dia');
  const date = isIsoDate(requested) ? requested : today;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // the sheet has no trigger of its own; focus goes back to the block that opened it
  const opener = useRef<HTMLElement | null>(null);
  const select = (id: string) => {
    opener.current = document.activeElement as HTMLElement | null;
    setSelectedId(id);
  };

  const agenda = useAgenda(date);
  const schedule = useMySchedule();

  const goTo = (day: string) => setSearch(day === today ? {} : { dia: day }, { replace: false });

  const header = (
    <PageHeader
      title="Agenda"
      description={capitalize(formatLongDate(date))}
      actions={<DayToolbar date={date} today={today} onChange={goTo} />}
    />
  );

  if (agenda.isPending || schedule.isPending) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    );
  }
  if (agenda.isError || schedule.isError) {
    const error = agenda.error ?? schedule.error;
    return (
      <>
        {header}
        <ErrorState
          error={error}
          onRetry={() => {
            void agenda.refetch();
            void schedule.refetch();
          }}
        />
      </>
    );
  }

  const appointments = agenda.data;
  const booked = appointments.filter((a) => a.status === 'BOOKED');
  const total = booked.reduce((sum, a) => sum + a.priceCents, 0);
  const hours = schedule.data.weekly.filter((i) => i.weekday === weekdayOf(date));
  const blocked = schedule.data.blockedDates.includes(date);
  const hoursText = hours.length
    ? `Horário de trabalho: ${hours.map((i) => `${i.startTime} às ${i.endTime}`).join(' e ')}.`
    : 'Folga: sem horário de trabalho neste dia da semana.';

  return (
    <>
      {header}
      <p className="mb-6 text-muted-foreground">
        {booked.length
          ? `${appointmentsCount(booked.length)}, ${formatBRL(total)} previstos`
          : appointmentsCount(0)}
      </p>
      {blocked && (
        <p className="mb-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          Dia bloqueado. Ninguém consegue agendar.
        </p>
      )}

      {appointments.length === 0 ? (
        <EmptyState title="Nenhum agendamento neste dia">{!blocked && hoursText}</EmptyState>
      ) : (
        <Timeline
          appointments={appointments}
          hours={blocked ? [] : hours}
          timeZone={timeZone}
          nowMinute={date === today ? minutesOfDay(now.toISOString(), timeZone) : null}
          onSelect={select}
        />
      )}

      <AppointmentSheet
        appointment={appointments.find((a) => a.id === selectedId)}
        timeZone={timeZone}
        now={now}
        onClose={() => setSelectedId(null)}
        returnFocus={() => opener.current?.focus()}
      />
    </>
  );
}
