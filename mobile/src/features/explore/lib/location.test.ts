import * as Location from 'expo-location';
import { deviceLocation } from './location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
const mocked = Location as jest.Mocked<typeof Location>;
const fix = (latitude: number) => ({ coords: { latitude, longitude: -46.6 } }) as never;

describe('the real location source', () => {
  it('asks for permission', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as never);
    expect(await deviceLocation.request()).toBe(true);
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
    expect(await deviceLocation.request()).toBe(false);
  });

  it('uses a recent fix when there is one, or waits for a fresh one', async () => {
    mocked.getLastKnownPositionAsync.mockResolvedValueOnce(fix(-23.5));
    expect(await deviceLocation.current()).toEqual({ latitude: -23.5, longitude: -46.6 });
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();

    mocked.getLastKnownPositionAsync.mockResolvedValueOnce(null);
    mocked.getCurrentPositionAsync.mockResolvedValueOnce(fix(-23.6));
    expect(await deviceLocation.current()).toEqual({ latitude: -23.6, longitude: -46.6 });
  });
});
