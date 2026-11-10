import { DomainError } from '../../../shared/domain/domain-error.js';

export type PushPlatform = 'ios' | 'android';

// what Expo's getExpoPushTokenAsync returns; both prefixes are in use
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]{1,200}\]$/;

/** An Expo push token, which identifies one install of the app on one phone. */
export function parsePushToken(raw: string): string {
  const token = raw.trim();
  if (!EXPO_TOKEN.test(token)) {
    throw new DomainError('INVALID_PUSH_TOKEN', 'Not an Expo push token.');
  }
  return token;
}

export const parsePushPlatform = (value: 'IOS' | 'ANDROID'): PushPlatform =>
  value === 'IOS' ? 'ios' : 'android';
