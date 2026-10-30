import { DomainError } from '../../../shared/domain/domain-error.js';
import { issueSession } from './issue-session.js';
import type { IdentityDeps, Session } from './ports.js';

const invalid = () =>
  new DomainError('INVALID_REFRESH_TOKEN', 'Your session has ended. Sign in again.');

/**
 * Rotation with reuse detection: each refresh token works once. A token presented after it
 * was used means it leaked (or two tabs raced), so every session of that user is revoked.
 */
export async function refreshSession(deps: IdentityDeps, rawToken: string): Promise<Session> {
  const now = deps.clock.now();
  const stored = await deps.refreshTokens.findByHash(deps.secrets.hash(rawToken));
  if (!stored) throw invalid();

  if (stored.revokedAt || !(await deps.refreshTokens.revoke(stored.id, now))) {
    await deps.refreshTokens.revokeAllForUser(stored.userId, now);
    throw invalid();
  }
  if (stored.expiresAt <= now) throw invalid();

  const user = await deps.users.findById(stored.userId);
  if (!user) throw invalid();
  return issueSession(deps, user);
}
