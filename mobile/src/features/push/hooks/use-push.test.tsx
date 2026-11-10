import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useSignOut } from '@/features/auth/hooks/use-auth';
import { fakePush } from '@/test/fake-push';
import { renderWithProviders } from '@/test/render';
import { PENDING_UNREGISTER } from '../lib/push-device';
import { usePushRegistration } from './use-push';

function Registered() {
  usePushRegistration();
  const signOut = useSignOut();
  return (
    <Pressable accessibilityRole="button" onPress={signOut}>
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

  it('tries again when the first registration fails', async () => {
    const push = fakePush({ permission: 'granted' });
    let attempts = 0;
    const { server } = await renderWithProviders(<Registered />, {
      handlers: {
        RegisterPushToken: () => {
          attempts += 1;
          return attempts === 1
            ? new Response('down', { status: 502 })
            : { registerPushToken: true };
        },
      },
      push: push.device,
    });
    await waitFor(() => expect(server.variablesOf('RegisterPushToken')).toHaveLength(2), {
      timeout: 4000,
    });
  });

  it('unregisters the phone when the session ends, without needing the session', async () => {
    const push = fakePush({ permission: 'granted' });
    const { server, session } = await renderWithProviders(<Registered />, {
      handlers,
      push: push.device,
    });
    await waitFor(() => expect(server.variablesOf('RegisterPushToken')).toHaveLength(1));

    await fireEvent.press(screen.getByRole('button'));

    expect(session.get()).toBeNull();
    await waitFor(() =>
      expect(server.calls.filter((c) => c.operation === 'UnregisterPushToken')).toEqual([
        {
          operation: 'UnregisterPushToken',
          variables: { token: 'ExpoPushToken[test-phone]' },
          authorization: null,
        },
      ]),
    );
    expect(push.calls.badges.at(-1)).toBe(0);
  });

  it('unregisters a phone whose registration was still running when the session ended', async () => {
    const push = fakePush({ permission: 'granted' });
    let finish: () => void = () => {};
    const { server } = await renderWithProviders(<Registered />, {
      handlers: {
        ...handlers,
        RegisterPushToken: () =>
          new Promise((resolve) => {
            finish = () => resolve({ registerPushToken: true });
          }),
      },
      push: push.device,
    });
    await waitFor(() => expect(server.variablesOf('RegisterPushToken')).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button'));
    await act(async () => finish());
    await waitFor(() =>
      expect(server.calls.map((c) => c.operation).at(-1)).toBe('UnregisterPushToken'),
    );
  });

  it('offline, keeps the token and unregisters it on the next start', async () => {
    const push = fakePush({ permission: 'granted' });
    const { server } = await renderWithProviders(<Registered />, {
      handlers: { ...handlers, UnregisterPushToken: () => new Response('down', { status: 502 }) },
      push: push.device,
    });
    await waitFor(() => expect(server.variablesOf('RegisterPushToken')).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button'));
    await waitFor(() => expect(server.variablesOf('UnregisterPushToken')).toHaveLength(1));
    await waitFor(() =>
      expect(push.stored.get(PENDING_UNREGISTER)).toBe('ExpoPushToken[test-phone]'),
    );

    // the next start, with the network back
    const next = fakePush({ stored: Object.fromEntries(push.stored) });
    const again = await renderWithProviders(<Registered />, {
      handlers,
      push: next.device,
      signedIn: false,
    });
    await waitFor(() =>
      expect(again.server.variablesOf('UnregisterPushToken')).toEqual([
        { token: 'ExpoPushToken[test-phone]' },
      ]),
    );
    await waitFor(() => expect(next.stored.has(PENDING_UNREGISTER)).toBe(false));
  });
});
