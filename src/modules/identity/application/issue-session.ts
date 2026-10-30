import { randomUUID } from 'node:crypto';
import type { User } from '../domain/user.js';
import type { IdentityDeps, Session } from './ports.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A short-lived access token plus a refresh token; only the refresh token's hash is stored. */
export async function issueSession(deps: IdentityDeps, user: User): Promise<Session> {
  const access = await deps.accessTokens.issue(user.id);
  const refreshToken = deps.secrets.random();
  await deps.refreshTokens.create({
    id: randomUUID(),
    userId: user.id,
    tokenHash: deps.secrets.hash(refreshToken),
    expiresAt: new Date(deps.clock.now().getTime() + deps.refreshTokenTtlDays * DAY_MS),
  });
  return { user, accessToken: access.token, accessTokenExpiresAt: access.expiresAt, refreshToken };
}
