import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { appointment } from '@/test/agenda-fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderHookWithClient, signIn } from '@/test/render';
import { server } from '@/test/server';
import {
  agendaKeys,
  useAgenda,
  useCancelAppointment,
  useRescheduleAppointment,
} from './use-agenda';
import { wasChangedHere } from '../lib/changed-here';

describe('agenda mutations', () => {
  it('shows a cancellation in the cached day before any refetch', async () => {
    signIn();
    const booked = appointment();
    let agendaCalls = 0;
    server.use(
      api.query('BarberAgenda', () => {
        agendaCalls += 1;
        // the refetch after the mutation is held back, so only the cache write can show it
        return agendaCalls === 1 ? gqlData({ barberAgenda: [booked] }) : new Promise(() => {});
      }),
      api.mutation('CancelAppointment', () =>
        gqlData({ cancelAppointment: { ...booked, status: 'CANCELED', cancelReason: 'BARBER' } }),
      ),
    );
    const { result } = renderHookWithClient(() => ({
      day: useAgenda('2026-11-02'),
      cancel: useCancelAppointment('America/Sao_Paulo'),
    }));
    await waitFor(() => expect(result.current.day.data).toHaveLength(1));

    await act(() => result.current.cancel.mutateAsync(booked.id));

    expect(result.current.day.data?.[0]?.status).toBe('CANCELED');
  });

  it('refetches both days when an appointment moves to another day', async () => {
    signIn();
    const booked = appointment();
    const requested: string[] = [];
    server.use(
      api.query('BarberAgenda', ({ variables }) => {
        requested.push(variables.date as string);
        return gqlData({ barberAgenda: [] });
      }),
      api.mutation('RescheduleAppointment', () =>
        gqlData({
          rescheduleAppointment: {
            ...booked,
            startsAt: '2026-11-03T17:00:00.000Z',
            endsAt: '2026-11-03T17:30:00.000Z',
          },
        }),
      ),
    );
    const { result, queryClient } = renderHookWithClient(() => ({
      monday: useAgenda('2026-11-02'),
      tuesday: useAgenda('2026-11-03'),
      move: useRescheduleAppointment('America/Sao_Paulo'),
    }));
    await waitFor(() => expect(requested.sort()).toEqual(['2026-11-02', '2026-11-03']));

    await act(() =>
      result.current.move.mutateAsync({ id: booked.id, startsAt: '2026-11-03T17:00:00.000Z' }),
    );

    await waitFor(() => expect(requested).toHaveLength(4));
    expect(queryClient.getQueryState(agendaKeys.day('2026-11-02'))?.isInvalidated).toBe(false);
  });

  it('marks a change as made here before the server answers', async () => {
    signIn();
    const booked = appointment();
    let release!: () => void;
    server.use(
      api.mutation(
        'CancelAppointment',
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve(gqlData({ cancelAppointment: { ...booked, status: 'CANCELED' } }));
          }),
      ),
      api.query('BarberAgenda', () => gqlData({ barberAgenda: [] })),
    );
    const { result } = renderHookWithClient(() => useCancelAppointment('America/Sao_Paulo'));
    act(() => result.current.mutate(booked.id));
    // the live echo can arrive before the response
    await waitFor(() => expect(wasChangedHere(booked.id)).toBe(true));
    release();
  });

  it('moves a rescheduled appointment out of its old day at once', async () => {
    signIn();
    const booked = appointment();
    server.use(
      api.query('BarberAgenda', ({ variables }) =>
        variables.date === '2026-11-02'
          ? gqlData({ barberAgenda: [booked] })
          : new Promise(() => {}),
      ),
      api.mutation('RescheduleAppointment', () =>
        gqlData({
          rescheduleAppointment: {
            ...booked,
            startsAt: '2026-11-03T17:00:00.000Z',
            endsAt: '2026-11-03T17:30:00.000Z',
          },
        }),
      ),
    );
    const { result } = renderHookWithClient(() => ({
      monday: useAgenda('2026-11-02'),
      move: useRescheduleAppointment('America/Sao_Paulo'),
    }));
    await waitFor(() => expect(result.current.monday.data).toHaveLength(1));
    server.use(api.query('BarberAgenda', () => new Promise(() => {})));

    await act(() =>
      result.current.move.mutateAsync({ id: booked.id, startsAt: '2026-11-03T17:00:00.000Z' }),
    );

    expect(result.current.monday.data).toEqual([]);
  });
});
