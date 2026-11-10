import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { testRouter } from 'expo-router/testing-library';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { AccountScreen } from '@/features/account/screens/account-screen';
import { AppointmentScreen } from '@/features/appointments/screens/appointment-screen';
import { appointment } from '@/test/fixtures';
import { fakePush } from '@/test/fake-push';
import { renderAppRouter } from '@/test/render';
import { PushListener } from './push-listener';

const upcoming = appointment();
const handlers = {
  MyAppointments: () => ({ myAppointments: [upcoming] }),
  Me: () => ({ me: { id: 'u1', name: 'Ana Souza', email: 'ana@example.com' } }),
  Notifications: () => ({ notifications: [] }),
  RegisterPushToken: () => ({ registerPushToken: true }),
};

function AppointmentRoute() {
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  return <AppointmentScreen id={id} notice={novo ? 'booked' : undefined} />;
}

describe('asking for pushes after the first booking', () => {
  const open = (push: ReturnType<typeof fakePush>) =>
    renderAppRouter(
      { 'agendamento/[id]': AppointmentRoute },
      { initialUrl: `/agendamento/${upcoming.id}?novo=1`, handlers, push: push.device },
    );

  it('offers to turn pushes on, and says when they are on', async () => {
    const push = fakePush({ permission: 'undetermined' });
    await open(push);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ativar avisos no celular' }));
    expect(await screen.findByText('Avisos ativados.')).toBeTruthy();
    expect(push.calls.request).toBe(1);
  });

  it('can be put off, and stays off for the next bookings', async () => {
    const push = fakePush({ permission: 'undetermined' });
    await open(push);
    await fireEvent.press(await screen.findByRole('button', { name: 'Agora não' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Ativar avisos no celular' })).toBeNull(),
    );

    const next = fakePush({ permission: 'undetermined', stored: Object.fromEntries(push.stored) });
    await open(next);
    expect(await screen.findByText('Agendado')).toBeTruthy();
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Ativar avisos no celular' })).toBeNull();
  });

  it('does not ask again once the user answered', async () => {
    await open(fakePush({ permission: 'denied' }));
    expect(await screen.findByText('Agendado')).toBeTruthy();
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Ativar avisos no celular' })).toBeNull();
  });

  it('says so when the user says no in the system prompt', async () => {
    const push = fakePush({ permission: 'undetermined', answer: 'denied' });
    await open(push);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ativar avisos no celular' }));
    expect(await screen.findByText(/Tudo bem/)).toBeTruthy();
  });
});

describe('the setting in Conta', () => {
  const open = (push?: ReturnType<typeof fakePush>) =>
    renderAppRouter(
      { conta: AccountScreen },
      { initialUrl: '/conta', handlers, push: push?.device },
    );

  it('turns pushes on', async () => {
    const push = fakePush({ permission: 'undetermined' });
    await open(push);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ativar avisos' }));
    expect(await screen.findByText('Ativados neste celular.')).toBeTruthy();
  });

  it('follows the phone settings after the user turned pushes on there', async () => {
    const push = fakePush({ permission: 'undetermined', answer: 'denied' });
    const { queryClient } = await open(push);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ativar avisos' }));
    expect(await screen.findByRole('button', { name: 'Abrir Ajustes' })).toBeTruthy();
    // back from Ajustes, notifications allowed there
    push.device.permission = async () => 'granted';
    await act(() => queryClient.invalidateQueries({ queryKey: ['push', 'permission'] }));
    expect(await screen.findByText('Ativados neste celular.')).toBeTruthy();
  });

  it('sends to the phone settings when they were turned off there', async () => {
    const push = fakePush({ permission: 'denied' });
    await open(push);
    await fireEvent.press(await screen.findByRole('button', { name: 'Abrir Ajustes' }));
    expect(push.calls.settings).toBe(1);
  });

  it('does not show on a device without pushes', async () => {
    await open();
    expect(await screen.findByText('ana@example.com')).toBeTruthy();
    expect(screen.queryByText('Avisos no celular')).toBeNull();
  });
});

describe('a tapped push', () => {
  function RootLayout() {
    return (
      <>
        <PushListener />
        <Stack />
      </>
    );
  }
  const routes = {
    _layout: RootLayout,
    index: () => <Text>início</Text>,
    'agendamento/[id]': () => <Text>agendamento</Text>,
    avisos: () => <Text>avisos</Text>,
  };

  it('opens where it points', async () => {
    const push = fakePush({ permission: 'granted' });
    await renderAppRouter(routes, { handlers, push: push.device });
    await act(async () => push.tap({ id: 'n1', url: '/agendamento/appt-1' }));
    await waitFor(() => expect(screen).toHavePathname('/agendamento/appt-1'));
  });

  it('opens once when it started the app from closed', async () => {
    const push = fakePush({ permission: 'granted', lastTap: { id: 'n1', url: '/avisos' } });
    await renderAppRouter(routes, { handlers, push: push.device });
    await waitFor(() => expect(screen).toHavePathname('/avisos'));
    // the same tap also reaching the listener does not open a second screen
    await act(async () => push.tap({ id: 'n1', url: '/avisos' }));
    await testRouter.back();
    expect(screen).toHavePathname('/');
    expect(testRouter.canGoBack()).toBe(false);
  });

  it('forgets a tap once handled, so a later start does not open it again', async () => {
    const push = fakePush({ permission: 'granted' });
    await renderAppRouter(routes, { handlers, push: push.device });
    await act(async () => push.tap({ id: 'n2', url: '/avisos' }));
    expect(push.calls.clearLastTap).toBe(1);
  });

  it('ignores a link that leaves the app', async () => {
    const push = fakePush({ permission: 'granted' });
    await renderAppRouter(routes, { handlers, push: push.device });
    await act(async () => push.tap({ id: 'n1', url: 'https://evil.example' }));
    expect(screen).toHavePathname('/');
  });

  it('keeps the app icon badge at the unread count', async () => {
    const push = fakePush({ permission: 'granted' });
    await renderAppRouter(routes, {
      handlers: { ...handlers, UnreadNotificationCount: () => ({ unreadNotificationCount: 2 }) },
      push: push.device,
    });
    await waitFor(() => expect(push.calls.badges.at(-1)).toBe(2));
  });

  it('refreshes Avisos when a push arrives with the app open', async () => {
    const push = fakePush({ permission: 'granted' });
    const { queryClient } = await renderAppRouter(routes, { handlers, push: push.device });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await act(async () => push.receive());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments'] });
  });
});
