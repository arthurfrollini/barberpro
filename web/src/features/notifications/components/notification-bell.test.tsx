import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARBER, ME, workspaces } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';
import { NotificationBell } from './notification-bell';

const NOW = new Date('2026-11-02T12:00:00Z');

const notification = (overrides: Record<string, unknown>) => ({
  id: 'n1',
  type: 'APPOINTMENT_BOOKED',
  title: 'Novo agendamento',
  body: 'Ana agendou Corte para seg, 2 de nov às 14:00.',
  read: false,
  createdAt: '2026-11-02T11:55:00.000Z',
  appointmentStartsAt: '2026-11-03T17:00:00.000Z',
  appointment: {
    id: 'a1',
    startsAt: '2026-11-03T17:00:00.000Z',
    serviceName: 'Corte',
    cancelReason: null,
    customer: { id: 'c1', name: 'Ana' },
    barber: {
      id: 'barber-1',
      name: 'José',
      barbershop: { id: 'shop-1', name: 'Mega Barbearia SP', timezone: 'America/Sao_Paulo' },
    },
  },
  ...overrides,
});

function setup(
  unread: number,
  list: ReturnType<typeof notification>[],
  shops: unknown = workspaces({ barber: true }),
) {
  signIn();
  const marked: string[] = [];
  let count = unread;
  server.use(
    api.query('Workspaces', () => gqlData(shops as Record<string, unknown>)),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('UnreadNotificationCount', () => gqlData({ unreadNotificationCount: count })),
    api.query('Notifications', () => gqlData({ notifications: list })),
    api.mutation('MarkNotificationRead', ({ variables }) => {
      marked.push(variables.id as string);
      count -= 1;
      return gqlData({ markNotificationRead: true });
    }),
  );
  const view = renderRoutes(
    [
      { path: '/', element: <NotificationBell /> },
      { path: '/agenda', element: <p>Agenda aberta</p> },
    ],
    { path: '/' },
  );
  return { ...view, marked };
}

describe('notification bell', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('shows how many are unread', async () => {
    setup(3, []);
    expect(
      await screen.findByRole('button', { name: 'Notificações, 3 não lidas' }),
    ).toBeInTheDocument();
  });

  it('caps the badge at 9+', async () => {
    setup(12, []);
    const bell = await screen.findByRole('button', { name: 'Notificações, 12 não lidas' });
    expect(within(bell).getByText('9+')).toBeInTheDocument();
  });

  it('lists the newest notifications when opened', async () => {
    const { user } = setup(1, [
      notification({}),
      notification({
        id: 'n2',
        title: 'Aviso da barbearia',
        read: true,
        appointment: null,
        createdAt: '2026-11-01T12:00:00.000Z',
      }),
    ]);
    await user.click(await screen.findByRole('button', { name: 'Notificações, 1 não lida' }));
    expect(await screen.findByText('Novo agendamento')).toBeInTheDocument();
    expect(screen.getByText('Ana agendou Corte para ter 3/11 às 14:00.')).toBeInTheDocument();
    expect(screen.getByText('há 5 minutos')).toBeInTheDocument();
    expect(screen.getByText('ontem')).toBeInTheDocument();
  });

  it('marks a notification read and opens its day on the agenda', async () => {
    const { user, marked, router } = setup(1, [notification({})]);
    await user.click(await screen.findByRole('button', { name: 'Notificações, 1 não lida' }));
    await user.click(await screen.findByRole('button', { name: /Novo agendamento/ }));

    expect(marked).toEqual(['n1']);
    expect(await screen.findByText('Agenda aberta')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?dia=2026-11-03');
  });

  it('drops the count as soon as a notification is opened', async () => {
    const { user } = setup(2, [notification({ appointment: null, appointmentStartsAt: null })]);
    await user.click(await screen.findByRole('button', { name: 'Notificações, 2 não lidas' }));
    server.use(api.mutation('MarkNotificationRead', () => new Promise(() => {})));
    await user.click(await screen.findByRole('button', { name: /Novo agendamento/ }));
    expect(
      await screen.findByRole('button', { name: 'Notificações, 1 não lida' }),
    ).toBeInTheDocument();
  });

  it('says when there is nothing yet', async () => {
    const { user } = setup(0, []);
    await user.click(await screen.findByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Nada por aqui ainda.')).toBeInTheDocument();
  });

  it('names the shop when the user works in more than one', async () => {
    const other = {
      id: 'shop-2',
      name: 'Barbearia do Centro',
      timezone: 'America/Sao_Paulo',
      logoUrl: null,
    };
    const { user } = setup(1, [notification({})], {
      myBarbershops: [],
      myBarberProfiles: [BARBER, { ...BARBER, id: 'barber-2', barbershop: other }],
    });
    await user.click(await screen.findByRole('button', { name: 'Notificações, 1 não lida' }));
    expect(await screen.findByText('Mega Barbearia SP')).toBeInTheDocument();
  });

  it('leaves the shop out when there is only one', async () => {
    const { user } = setup(1, [notification({})]);
    await user.click(await screen.findByRole('button', { name: 'Notificações, 1 não lida' }));
    await screen.findByText('Novo agendamento');
    expect(screen.queryByText('Mega Barbearia SP')).not.toBeInTheDocument();
  });
});
