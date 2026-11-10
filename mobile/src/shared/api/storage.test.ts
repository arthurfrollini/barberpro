import * as SecureStore from 'expo-secure-store';
import type { KeyValueStorage } from './session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'stored'),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

/** The module picks its backend at import time, so each case imports it fresh for an OS. */
/* eslint-disable @typescript-eslint/no-require-imports */
const load = (os: string) => {
  let storage: KeyValueStorage | undefined;
  jest.isolateModules(() => {
    const { Platform: platform } = require('react-native');
    Object.defineProperty(platform, 'OS', { value: os, configurable: true });
    storage = require('./storage').deviceStorage;
  });
  return storage!;
};

describe('device storage', () => {
  it('keeps the session in SecureStore on a phone', async () => {
    const storage = load('ios');
    expect(await storage.getItem('k')).toBe('stored');
    await storage.setItem('k', 'v');
    await storage.removeItem('k');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('k', 'v');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('k');
  });

  it('falls back to localStorage on web', async () => {
    const data = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    };
    const storage = load('web');

    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});
