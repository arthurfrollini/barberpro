import { act, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import { createQueryClient } from '@/shared/api/query-client';
import { appointment } from '@/test/agenda-fixtures';
import type { AgendaChange, AgendaWatcher } from '../api/live';
import { useAgendaLive } from './use-agenda-live';

function fakeWatch() {
  const handlers: Parameters<AgendaWatcher>[0][] = [];
  const stop = vi.fn();
  const watch: AgendaWatcher = (h) => {
    handlers.push(h);
    return stop;
  };
  return { watch, stop, emit: (change: AgendaChange) => handlers.at(-1)!.next(change), handlers };
}

function setup() {
  const queryClient = createQueryClient({ retries: 0 });
  queryClient.setQueryData(['agenda', '2026-11-02'], []);
  queryClient.setQueryData(['notifications', 'unread'], 0);
  const live = fakeWatch();
  const view = renderHook(() => useAgendaLive('America/Sao_Paulo', live.watch), {
    wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
  });
  return { ...view, queryClient, live };
}

const ana = appointment({
  startsAt: '2026-11-02T17:00:00.000Z',
  customer: { id: 'c1', name: 'Ana' },
});

describe('useAgendaLive', () => {
  it('refreshes the agenda and the notifications and says what happened', async () => {
    const { queryClient, live } = setup();
    act(() => live.emit({ type: 'BOOKED', previousStartsAt: null, appointment: ana }));

    expect(await screen.findByText('Novo agendamento: Ana, seg 2/11 às 14:00')).toBeInTheDocument();
    expect(queryClient.getQueryState(['agenda', '2026-11-02'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['notifications', 'unread'])?.isInvalidated).toBe(true);
  });

  it('words cancellations and reschedules', async () => {
    const { live } = setup();
    act(() => live.emit({ type: 'CANCELED', previousStartsAt: null, appointment: ana }));
    act(() =>
      live.emit({
        type: 'RESCHEDULED',
        previousStartsAt: '2026-11-02T17:00:00.000Z',
        appointment: { ...ana, startsAt: '2026-11-02T18:30:00.000Z' },
      }),
    );
    expect(
      await screen.findByText('Agendamento cancelado: Ana, seg 2/11 às 14:00'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Ana remarcou para seg 2/11 às 15:30')).toBeInTheDocument();
  });

  it('refetches quietly after reconnecting, and stops when unmounted', () => {
    const { queryClient, live, unmount } = setup();
    act(() => live.handlers.at(-1)!.reconnected());
    expect(queryClient.getQueryState(['agenda', '2026-11-02'])?.isInvalidated).toBe(true);
    unmount();
    expect(live.stop).toHaveBeenCalledTimes(1);
  });
});
