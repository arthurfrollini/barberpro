import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { appointment } from '@/test/agenda-fixtures';
import { ME, roles } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

const NOW = new Date('2026-11-02T12:00:00Z'); // Monday 09:00 in São Paulo

function setup(blockedDates: string[], canceled: unknown[] = []) {
  signIn();
  const calls: string[] = [];
  let blocked = [...blockedDates];
  server.use(
    api.query('Roles', () => gqlData(roles({ barber: true }))),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MySchedule', () => gqlData({ mySchedule: { weekly: [], blockedDates: blocked } })),
    api.mutation('BlockDate', ({ variables }) => {
      calls.push(`block ${variables.date}`);
      blocked = [...blocked, variables.date as string];
      return gqlData({ blockDate: canceled });
    }),
    api.mutation('UnblockDate', ({ variables }) => {
      calls.push(`unblock ${variables.date}`);
      blocked = blocked.filter((d) => d !== variables.date);
      return gqlData({ unblockDate: true });
    }),
  );
  return { ...renderRoutes(routes, { path: '/horarios' }), calls };
}

const section = () => screen.findByRole('region', { name: 'Dias bloqueados' });

describe('days off', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('lists blocked days from today on, soonest first', async () => {
    setup(['2026-11-20', '2026-10-30', '2026-11-02']);
    const list = within(await section()).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining('Segunda-feira, 2 de novembro'),
      expect.stringContaining('Sexta-feira, 20 de novembro'),
    ]);
  });

  it('asks before blocking a day and lists what it canceled', async () => {
    const canceled = [
      appointment({
        startsAt: '2026-11-05T17:00:00.000Z',
        customer: { id: 'c1', name: 'Ana' },
        status: 'CANCELED',
        cancelReason: 'DAY_BLOCKED',
      }),
    ];
    const { user, calls } = setup([], canceled);
    const days = await section();
    expect(within(days).getByText('Nenhum dia bloqueado.')).toBeInTheDocument();
    await user.type(within(days).getByLabelText('Dia'), '2026-11-05');
    await user.click(within(days).getByRole('button', { name: 'Bloquear dia' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Bloquear quinta-feira, 5 de novembro?');
    await user.click(within(confirm).getByRole('button', { name: 'Bloquear dia' }));

    const dialog = await screen.findByRole('dialog', { name: '1 agendamento cancelado' });
    expect(calls).toEqual(['block 2026-11-05']);
    expect(dialog).toHaveTextContent('Eram do dia bloqueado.');
    expect(within(dialog).getByText('Ana, Corte, qui 5/11 às 14:00')).toBeInTheDocument();
  });

  it('unblocks a day', async () => {
    const { user, calls } = setup(['2026-11-20']);
    const days = await section();
    await user.click(
      within(days).getByRole('button', { name: 'Desbloquear sexta-feira, 20 de novembro' }),
    );
    expect(await within(days).findByText('Nenhum dia bloqueado.')).toBeInTheDocument();
    expect(calls).toEqual(['unblock 2026-11-20']);
  });
});
