import { parsePushPlatform, parsePushToken } from '../domain/push-token.js';
import type { NotifyDeps } from './ports.js';

/** The signed-in user's phone will get their notifications as pushes. */
export async function registerPushToken(
  deps: Pick<NotifyDeps, 'pushTokens' | 'clock'>,
  userId: string,
  rawToken: string,
  platform: 'IOS' | 'ANDROID',
): Promise<void> {
  await deps.pushTokens.save({
    token: parsePushToken(rawToken),
    userId,
    platform: parsePushPlatform(platform),
    at: deps.clock.now(),
  });
}

/** On sign-out. False when the token is not this user's (or not known at all). */
export async function unregisterPushToken(
  deps: Pick<NotifyDeps, 'pushTokens'>,
  userId: string,
  rawToken: string,
): Promise<boolean> {
  return deps.pushTokens.remove(rawToken.trim(), userId);
}
