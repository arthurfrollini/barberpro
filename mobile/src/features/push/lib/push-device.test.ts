import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { devicePush, noPush, showNotificationsInForeground } from './push-device';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExpoPushToken[device]' })),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } } },
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const response = (url: unknown) =>
  ({ notification: { request: { identifier: 'n1', content: { data: { url } } } } }) as never;

describe('the real push device', () => {
  it('reads the permission: granted, undecided while it can ask, denied after a no', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true } as never);
    expect(await devicePush.permission()).toBe('granted');
    mocked.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    } as never);
    expect(await devicePush.permission()).toBe('undetermined');
    mocked.requestPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    } as never);
    expect(await devicePush.request()).toBe('denied');
  });

  it('asks Expo for the token with the EAS project id', async () => {
    expect(await devicePush.token()).toBe('ExpoPushToken[device]');
    expect(mocked.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-1' });
  });

  it('creates the Android channel before asking for a token', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    await devicePush.token();
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
      name: 'Avisos',
      importance: 3,
    });
  });

  it('turns taps into app paths, and unsubscribes', async () => {
    const remove = jest.fn();
    let tapped: (r: never) => void = () => {};
    mocked.addNotificationResponseReceivedListener.mockImplementation((listener) => {
      tapped = listener as never;
      return { remove } as never;
    });
    const taps: unknown[] = [];
    const off = devicePush.onTap((tap) => taps.push(tap));
    tapped(response('/avisos'));
    tapped(response(42));
    off();
    expect(taps).toEqual([
      { id: 'n1', url: '/avisos' },
      { id: 'n1', url: null },
    ]);
    expect(remove).toHaveBeenCalled();

    mocked.getLastNotificationResponseAsync.mockResolvedValueOnce(response('/agendamento/a1'));
    expect(await devicePush.lastTap()).toEqual({ id: 'n1', url: '/agendamento/a1' });
    mocked.getLastNotificationResponseAsync.mockResolvedValueOnce(null);
    expect(await devicePush.lastTap()).toBeNull();
    devicePush.clearLastTap();
    expect(mocked.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('listens for pushes that arrive with the app open', () => {
    const remove = jest.fn();
    let received: () => void = () => {};
    mocked.addNotificationReceivedListener.mockImplementation((listener) => {
      received = listener as never;
      return { remove } as never;
    });
    const listener = jest.fn();
    const off = devicePush.onReceive(listener);
    received();
    off();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalled();
  });

  it('shows pushes in the foreground too, and opens the phone settings', async () => {
    showNotificationsInForeground();
    const handler = mocked.setNotificationHandler.mock.calls[0]![0]!;
    expect(await handler.handleNotification({} as never)).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    });
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    devicePush.openSettings();
    expect(open).toHaveBeenCalled();
  });
});

describe('a device without pushes', () => {
  it('never asks and never gives a token', async () => {
    expect(noPush.supported).toBe(false);
    expect(await noPush.permission()).toBe('denied');
    expect(await noPush.request()).toBe('denied');
    await expect(noPush.token()).rejects.toThrow();
    expect(await noPush.lastTap()).toBeNull();
    noPush.onReceive(() => {})();
    noPush.onTap(() => {})();
    noPush.clearLastTap();
    noPush.openSettings();
  });
});
