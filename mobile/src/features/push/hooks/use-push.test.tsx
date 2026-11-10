import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useSignOut } from '@/features/auth/hooks/use-auth';
import { fakePush } from '@/test/fake-push';
import { renderWithProviders } from '@/test/render';
import { usePushRegistration } from './use-push';

function Registered() {
  usePushRegistration();
  const signOut = useSignOut();
  return (
    <Pressable accessibilityRole="button" onPress={() => void signOut()}>
      <Text>Sair</Text>
    </Pressable>
  );
}

const handlers = {
  RegisterPushToken: () => ({ registerPushToken: true }),
  UnregisterPushToken: () => ({ unregisterPushToken: true }),
};

describe('push registration', () => {
  it('registers the phone when signed in and allowed', async () => {
    const push = fakePush({ permission: 'granted' });
    const { server } = await renderWithProviders(<Registered />, { handlers, push: push.device });
    await waitFor(() =>
      expect(server.variablesOf('RegisterPushToken')).toEqual([
        { token: 'ExpoPushToken[test-phone]', platform: 'IOS' },
      ]),
    );
  });

  it('does not ask, nor register, before the user said yes', async () => {
    const push = fakePush({ permission: 'undetermined' });
    const { server } = await renderWithProviders(<Registered />, { handlers, push: push.device });
    await act(async () => {});
    expect(push.calls.request).toBe(0);
    expect(server.variablesOf('RegisterPushToken')).toEqual([]);
  });

  it('registers nothing when signed out', async () => {
    const push = fakePush({ permission: 'granted' });
    const { server } = await renderWithProviders(<Registered />, {
      handlers,
      push: push.device,
      signedIn: false,
    });
    await act(async () => {});
    expect(server.variablesOf('RegisterPushToken')).toEqual([]);
  });

  it('shrugs off a phone that cannot give a token', async () => {
    const push = fakePush({
      permission: 'granted',
      token: async () => {
        throw new Error('no network');
      },
    });
    const { server } = await renderWithProviders(<Registered />, { handlers, push: push.device });
    await act(async () => {});
    expect(server.variablesOf('RegisterPushToken')).toEqual([]);
  });

  it('unregisters the phone before signing out', async () => {
    const push = fakePush({ permission: 'granted' });
    const { server, session } = await renderWithProviders(<Registered />, {
      handlers,
      push: push.device,
    });
    await waitFor(() => expect(server.variablesOf('RegisterPushToken')).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button'));
    await waitFor(() => expect(session.get()).toBeNull());
    const calls = server.calls.map((c) => [c.operation, c.authorization]);
    // unregistered while the session was still there to authorize it
    expect(calls).toContainEqual(['UnregisterPushToken', 'Bearer access-1']);
  });

  it('signs out anyway when the phone is offline', async () => {
    jest.useFakeTimers();
    const push = fakePush({ permission: 'granted' });
    const { server, session } = await renderWithProviders(<Registered />, {
      handlers: { ...handlers, UnregisterPushToken: () => new Promise(() => {}) },
      push: push.device,
    });
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    await waitFor(() => expect(server.variablesOf('RegisterPushToken')).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button'));
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    jest.useRealTimers();
    await waitFor(() => expect(session.get()).toBeNull());
  });
});
