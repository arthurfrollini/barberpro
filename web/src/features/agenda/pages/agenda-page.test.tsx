import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { appointment } from '@/test/agenda-fixtures';
import { ME, roles } from '@/test/fixtures';
import { api, gqlData, gqlError } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';
import type { AgendaAppointment } from '../api/agenda';

const NOW = new Date('2026-11-02T12:00:00Z'); // Monday 09:00 in São Paulo
// the live stream is covered by use-agenda-live.test.tsx and the Playwright test
vi.mock('../hooks/use-agenda-live', () => ({ useAgendaLive: () => {} }));

const MONDAY_HOURS = [{ weekday: 1, startTime: '08:00', endTime: '20:00' }];

function mockApi(days: Record<string, AgendaAppointment[]>, blockedDates: string[] = []) {
  const requested: string[] = [];
  server.use(
    api.query('Roles', () => gqlData(roles({ barber: true }))),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MySchedule', () => gqlData({ mySchedule: { weekly: MONDAY_HOURS, blockedDates } })),
    api.query('BarberAgenda', ({ variables }) => {
      requested.push(variables.date as string);
      return gqlData({ barberAgenda: days[variables.date as string] ?? [] });
    }),
  );
  return requested;
}

const list = () => screen.findByRole('list', { name: 'Agendamentos do dia' });

describe('agenda page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    signIn();
  });
  afterEach(() => vi.useRealTimers());

  it("shows today's appointments in the shop's time zone", async () => {
    mockApi({
      '2026-11-02': [
        appointment({ startsAt: '2026-11-02T17:00:00.000Z', customer: { id: 'c1', name: 'Ana' } }),
        appointment({
          startsAt: '2026-11-02T18:00:00.000Z',
          status: 'CANCELED',
          cancelReason: 'CUSTOMER',
          customer: { id: 'c2', name: 'Bia' },
        }),
      ],
    });
    renderRoutes(routes, { path: '/agenda' });

    const day = await list();
    expect(within(day).getByRole('button', { name: '14:00 Ana, Corte' })).toBeInTheDocument();
    expect(
      within(day).getByRole('button', { name: '15:00 Bia, Corte, cancelado' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Segunda-feira, 2 de novembro')).toBeInTheDocument();
    // canceled ones do not count
    expect(screen.getByText(/1 agendamento, R\$\s50,00 previstos/)).toBeInTheDocument();
  });

  it('moves between days through the URL', async () => {
    const requested = mockApi({});
    const { user, router } = renderRoutes(routes, { path: '/agenda' });
    await screen.findByText('Nenhum agendamento neste dia');

    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));
    await waitFor(() => expect(router.state.location.search).toBe('?dia=2026-11-03'));
    await user.click(screen.getByRole('button', { name: 'Dia anterior' }));
    await user.click(screen.getByRole('button', { name: 'Dia anterior' }));
    await waitFor(() => expect(router.state.location.search).toBe('?dia=2026-11-01'));
    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(requested).toEqual(expect.arrayContaining(['2026-11-02', '2026-11-03', '2026-11-01']));
  });

  it('ignores a malformed day in the URL', async () => {
    const requested = mockApi({});
    renderRoutes(routes, { path: '/agenda?dia=2026-02-30' });
    await screen.findByText('Nenhum agendamento neste dia');
    expect(requested).toEqual(['2026-11-02']);
  });

  it('shows the hours of an empty day, and blocked days', async () => {
    mockApi({}, ['2026-11-03']);
    const { user } = renderRoutes(routes, { path: '/agenda' });
    expect(await screen.findByText('Nenhum agendamento neste dia')).toBeInTheDocument();
    expect(screen.getByText('Horário de trabalho: 08:00 às 20:00.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));
    expect(await screen.findByText('Dia bloqueado. Ninguém consegue agendar.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dia anterior' }));
    await user.click(screen.getByRole('button', { name: 'Dia anterior' }));
    expect(
      await screen.findByText('Folga: sem horário de trabalho neste dia da semana.'),
    ).toBeInTheDocument();
  });

  it('cancels an appointment after confirming', async () => {
    const booked = appointment({ customer: { id: 'c1', name: 'Ana' } });
    const days = { '2026-11-02': [booked] };
    mockApi(days);
    server.use(
      api.mutation('CancelAppointment', ({ variables }) => {
        expect(variables).toEqual({ id: booked.id });
        const canceled = {
          ...booked,
          status: 'CANCELED' as const,
          cancelReason: 'BARBER' as const,
        };
        days['2026-11-02'] = [canceled];
        return gqlData({ cancelAppointment: canceled });
      }),
    );
    const { user } = renderRoutes(routes, { path: '/agenda' });
    await user.click(within(await list()).getByRole('button', { name: '14:00 Ana, Corte' }));

    const sheet = await screen.findByRole('dialog', { name: 'Ana' });
    expect(
      within(sheet).getByText('R$ 50,00', { normalizer: (t) => t.replace(/\s/g, ' ') }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('15 min antes')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Cancelar agendamento' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent(
      'Cancelar o agendamento de Ana às 14:00? O cliente recebe um aviso.',
    );
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar agendamento' }));

    expect(await screen.findByText('Agendamento cancelado')).toBeInTheDocument();
    // the sheet stays open on the canceled appointment, then the day shows it dimmed
    expect(await within(sheet).findByText('por você')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      await within(await list()).findByRole('button', { name: '14:00 Ana, Corte, cancelado' }),
    ).toBeInTheDocument();
  });

  it('blocks changes within 2 hours of the start', async () => {
    const soon = appointment({
      startsAt: '2026-11-02T13:30:00.000Z',
      customer: { id: 'c1', name: 'Ana' },
    });
    mockApi({ '2026-11-02': [soon] });
    const { user } = renderRoutes(routes, { path: '/agenda' });
    await user.click(within(await list()).getByRole('button', { name: '10:30 Ana, Corte' }));

    const sheet = await screen.findByRole('dialog', { name: 'Ana' });
    expect(within(sheet).getByRole('button', { name: 'Cancelar agendamento' })).toBeDisabled();
    expect(within(sheet).getByRole('button', { name: 'Remarcar' })).toBeDisabled();
    expect(
      within(sheet).getByText('Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.'),
    ).toBeInTheDocument();
  });

  it('shows the API refusal in Portuguese', async () => {
    const booked = appointment({ customer: { id: 'c1', name: 'Ana' } });
    mockApi({ '2026-11-02': [booked] });
    server.use(api.mutation('CancelAppointment', () => gqlError('CANCELLATION_WINDOW_CLOSED')));
    const { user } = renderRoutes(routes, { path: '/agenda' });
    await user.click(within(await list()).getByRole('button', { name: '14:00 Ana, Corte' }));
    const sheet = await screen.findByRole('dialog', { name: 'Ana' });
    await user.click(within(sheet).getByRole('button', { name: 'Cancelar agendamento' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar agendamento',
      }),
    );

    expect(
      await within(sheet).findByText(
        'Faltam menos de 2 horas: não dá mais para cancelar ou remarcar.',
      ),
    ).toBeInTheDocument();
  });

  it('moves an appointment to a free time on another day', async () => {
    const booked = appointment({ customer: { id: 'c1', name: 'Ana' } });
    mockApi({ '2026-11-02': [booked] });
    server.use(
      api.query('RescheduleSlots', ({ variables }) =>
        gqlData({
          rescheduleSlots:
            variables.date === '2026-11-03'
              ? ['2026-11-03T12:00:00.000Z', '2026-11-03T18:30:00.000Z']
              : ['2026-11-02T17:00:00.000Z', '2026-11-02T17:15:00.000Z'],
        }),
      ),
      api.mutation('RescheduleAppointment', ({ variables }) => {
        expect(variables).toEqual({ id: booked.id, startsAt: '2026-11-03T18:30:00.000Z' });
        return gqlData({
          rescheduleAppointment: {
            ...booked,
            startsAt: '2026-11-03T18:30:00.000Z',
            endsAt: '2026-11-03T19:00:00.000Z',
          },
        });
      }),
    );
    const { user } = renderRoutes(routes, { path: '/agenda' });
    await user.click(within(await list()).getByRole('button', { name: '14:00 Ana, Corte' }));
    const sheet = await screen.findByRole('dialog', { name: 'Ana' });
    await user.click(within(sheet).getByRole('button', { name: 'Remarcar' }));

    // the current time is not offered as a new one
    expect(await within(sheet).findByRole('button', { name: '14:15' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: '14:00' })).not.toBeInTheDocument();

    const dateInput = within(sheet).getByLabelText('Nova data');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-11-03');
    await user.click(await within(sheet).findByRole('button', { name: '15:30' }));
    await user.click(within(sheet).getByRole('button', { name: 'Confirmar novo horário' }));

    expect(
      await screen.findByText('Agendamento remarcado para ter 3/11 às 15:30'),
    ).toBeInTheDocument();
  });
});
