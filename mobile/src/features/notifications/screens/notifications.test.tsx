import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import TabsLayout from '@/app/(tabs)/_layout';
import { renderAppRouter } from '@/test/render';
import { NotificationsScreen } from './notifications-screen';

const SP = 'America/Sao_Paulo';

const notification = (over: Record<string, unknown> = {}) => ({
  id: 'n1',
  type: 'APPOINTMENT_CANCELED',
  title: 'Appointment canceled',
  body: 'English',
  read: false,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  appointmentStartsAt: '2026-11-06T17:00:00.000Z',
  appointment: {
    id: 'appt-1',
    startsAt: '2026-11-06T17:00:00.000Z',
    serviceName: 'Corte',
    cancelReason: 'BARBER',
    customer: { id: 'u1', name: 'Ana' },
    barber: { id: 'b1', name: 'Marcos', barbershop: { id: 's1', name: 'Navalha', timezone: SP } },
  },
  ...over,
});

const handlers = {
  Me: () => ({ me: { id: 'u1', name: 'Ana', email: 'ana@example.com' } }),
  Notifications: () => ({
    notifications: [
      notification(),
      notification({ id: 'n2', read: true, type: 'APPOINTMENT_REMINDER' }),
    ],
  }),
  UnreadNotificationCount: () => ({ unreadNotificationCount: 1 }),
  MarkNotificationRead: () => ({ markNotificationRead: true }),
};

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': () => <Text>explorar</Text>,
  '(tabs)/agendamentos': () => <Text>agendamentos</Text>,
  '(tabs)/avisos': NotificationsScreen,
  '(tabs)/conta': () => <Text>conta</Text>,
  'agendamento/[id]': () => <Text>agendamento</Text>,
  entrar: () => <Text>entrar</Text>,
  'criar-conta': () => <Text>criar conta</Text>,
};

describe('notifications', () => {
  it('lists them in Portuguese, unread first marked, and badges the tab', async () => {
    await renderAppRouter(routes, { initialUrl: '/avisos', handlers });
    expect(await screen.findByText('Marcos cancelou Corte de sex 6/11 às 14:00.')).toBeTruthy();
    expect(screen.getAllByText('há 5 minutos')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /^Não lido, Agendamento cancelado/ })).toBeTruthy();
    expect(await screen.findByLabelText(/^Avisos, 1 não lido/)).toBeTruthy();
  });

  it('marks one read and opens its appointment', async () => {
    const { server } = await renderAppRouter(routes, { initialUrl: '/avisos', handlers });
    await fireEvent.press(
      await screen.findByRole('link', { name: /^Não lido, Agendamento cancelado/ }),
    );
    await waitFor(() => expect(screen).toHavePathname('/agendamento/appt-1'));
    expect(server.variablesOf('MarkNotificationRead')).toEqual([{ id: 'n1' }]);
  });

  it('does not mark again one already read', async () => {
    const { server } = await renderAppRouter(routes, { initialUrl: '/avisos', handlers });
    await fireEvent.press(await screen.findByRole('link', { name: /^Lembrete/ }));
    await waitFor(() => expect(screen).toHavePathname('/agendamento/appt-1'));
    expect(server.variablesOf('MarkNotificationRead')).toEqual([]);
  });

  it('says when there is nothing yet', async () => {
    await renderAppRouter(routes, {
      initialUrl: '/avisos',
      handlers: { ...handlers, Notifications: () => ({ notifications: [] }) },
    });
    expect(await screen.findByText('Nenhum aviso por enquanto')).toBeTruthy();
  });

  it('signed out, asks to sign in and shows no badge', async () => {
    const { server } = await renderAppRouter(routes, {
      initialUrl: '/avisos',
      signedIn: false,
      handlers,
    });
    expect(screen.getByText('Entre para ver seus avisos')).toBeTruthy();
    expect(server.variablesOf('UnreadNotificationCount')).toEqual([]);
  });
});
