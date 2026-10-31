import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { appointment } from '@/test/agenda-fixtures';
import { ME, roles } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

const NINE_TO_SIX = (weekdays: number[]) =>
  weekdays.map((weekday) => ({ weekday, startTime: '09:00', endTime: '18:00' }));

function setup(weekly = NINE_TO_SIX([1, 2, 3, 4, 5, 6, 0]), canceled: unknown[] = []) {
  signIn();
  const sent: unknown[] = [];
  server.use(
    api.query('Roles', () => gqlData(roles({ barber: true }))),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MySchedule', () => gqlData({ mySchedule: { weekly, blockedDates: [] } })),
    api.mutation('SetWeeklySchedule', ({ variables }) => {
      sent.push(variables.intervals);
      return gqlData({
        setWeeklySchedule: { weekly: variables.intervals, canceledAppointments: canceled },
      });
    }),
  );
  return { ...renderRoutes(routes, { path: '/horarios' }), sent };
}

const day = (name: string) => screen.findByRole('group', { name });

describe('weekly hours', () => {
  it('saves a day turned off without its hours', async () => {
    const { user, sent } = setup();
    const save = await screen.findByRole('button', { name: 'Salvar horários' });
    expect(save).toBeDisabled();

    await user.click(
      within(await day('Domingo')).getByRole('switch', { name: 'Domingo: trabalha' }),
    );
    expect(within(await day('Domingo')).getByText('Folga')).toBeInTheDocument();
    await user.click(save);

    expect(await screen.findByText('Horários salvos')).toBeInTheDocument();
    expect(sent[0]).toEqual(NINE_TO_SIX([1, 2, 3, 4, 5, 6]));
    expect(screen.getByRole('button', { name: 'Salvar horários' })).toBeDisabled();
  });

  it("copies one day's hours to every working day", async () => {
    const { user, sent } = setup(NINE_TO_SIX([1, 2, 3]));
    const monday = await day('Segunda');
    await user.click(within(monday).getByRole('button', { name: 'Adicionar intervalo' }));
    const start = within(monday).getByRole('textbox', { name: 'Segunda, intervalo 2, início' });
    const end = within(monday).getByRole('textbox', { name: 'Segunda, intervalo 2, fim' });
    await user.clear(start);
    await user.type(start, '19:00');
    await user.clear(end);
    await user.type(end, '21:00');
    await user.click(
      within(monday).getByRole('button', {
        name: 'Usar estes horários em todos os dias de trabalho',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Salvar horários' }));

    await screen.findByText('Horários salvos');
    const both = (weekday: number) => [
      { weekday, startTime: '09:00', endTime: '18:00' },
      { weekday, startTime: '19:00', endTime: '21:00' },
    ];
    expect(sent[0]).toEqual([...both(1), ...both(2), ...both(3)]);
  });

  it('points at the overlapping interval before calling the API', async () => {
    const { user, sent } = setup(NINE_TO_SIX([1]));
    const monday = await day('Segunda');
    await user.click(within(monday).getByRole('button', { name: 'Adicionar intervalo' }));
    const start = within(monday).getByRole('textbox', { name: 'Segunda, intervalo 2, início' });
    await user.type(start, '17:00');
    await user.type(
      within(monday).getByRole('textbox', { name: 'Segunda, intervalo 2, fim' }),
      '19:00',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar horários' }));

    expect(
      await within(monday).findByText('Os intervalos de segunda se sobrepõem'),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);

    // fixing the other interval clears the message without saving again
    const firstEnd = within(monday).getByRole('textbox', { name: 'Segunda, intervalo 1, fim' });
    await user.clear(firstEnd);
    await user.type(firstEnd, '17:00');
    await waitFor(() =>
      expect(within(monday).queryByText('Os intervalos de segunda se sobrepõem')).toBeNull(),
    );
  });

  it('says when there is no other working day to copy to', async () => {
    const { user } = setup(NINE_TO_SIX([1]));
    const monday = await day('Segunda');
    await user.click(
      within(monday).getByRole('button', {
        name: 'Usar estes horários em todos os dias de trabalho',
      }),
    );
    expect(
      await screen.findByText(
        'Ligue os outros dias de trabalho primeiro; eles recebem estes horários.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar horários' })).toBeDisabled();
  });

  it('lists the appointments the new hours canceled', async () => {
    const canceled = [
      appointment({
        customer: { id: 'c1', name: 'Ana' },
        status: 'CANCELED',
        cancelReason: 'SCHEDULE_CHANGED',
      }),
      appointment({
        startsAt: '2026-11-03T20:00:00.000Z',
        customer: { id: 'c2', name: 'Bia' },
        status: 'CANCELED',
        cancelReason: 'SCHEDULE_CHANGED',
      }),
    ];
    const { user } = setup(NINE_TO_SIX([1, 2]), canceled);
    await user.click(within(await day('Terça')).getByRole('switch', { name: 'Terça: trabalha' }));
    await user.click(screen.getByRole('button', { name: 'Salvar horários' }));

    const dialog = await screen.findByRole('dialog', { name: '2 agendamentos cancelados' });
    expect(within(dialog).getByText('Ana, Corte, seg 2/11 às 14:00')).toBeInTheDocument();
    expect(within(dialog).getByText('Bia, Corte, ter 3/11 às 17:00')).toBeInTheDocument();
  });
});
