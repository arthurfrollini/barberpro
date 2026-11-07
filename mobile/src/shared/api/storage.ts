import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { KeyValueStorage } from './session';

/**
 * Where the session lives: the Keychain (iOS) or the Keystore (Android) through SecureStore,
 * and localStorage on web, where SecureStore does not exist.
 */
export const deviceStorage: KeyValueStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
        setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
        removeItem: async (key) => globalThis.localStorage?.removeItem(key),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
