import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { parsePushPlatform, parsePushToken } from './push-token.js';

describe('push token', () => {
  it.each(['ExponentPushToken[abc-123_XYZ]', 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]'])(
    'accepts %s',
    (token) => {
      expect(parsePushToken(` ${token} `)).toBe(token);
    },
  );

  it.each([
    '',
    'abc',
    'ExponentPushToken[]',
    'ExponentPushToken[a',
    `ExpoPushToken[${'a'.repeat(300)}]`,
  ])('rejects %j', (raw) => {
    expect(() => parsePushToken(raw)).toThrow(DomainError);
    expect(() => parsePushToken(raw)).toThrow(
      expect.objectContaining({ code: 'INVALID_PUSH_TOKEN' }),
    );
  });

  it('reads the platform from the GraphQL enum', () => {
    expect(parsePushPlatform('IOS')).toBe('ios');
    expect(parsePushPlatform('ANDROID')).toBe('android');
  });
});
