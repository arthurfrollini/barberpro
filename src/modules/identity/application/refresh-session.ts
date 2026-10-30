import { DomainError } from '../../../shared/domain/domain-error.js';
import { issueSession } from './issue-session.js';
import type { IdentityDeps, Session } from './ports.js';

const invalid = () =>
  new DomainError('INVALID_REFRESH_TOKEN', 'Your session has ended. Sign in again.');

/**
 * Rotation with reuse detection: each refresh token works once. A token presented after it
 * was used means it leaked (or two tabs raced), so every session of that user is revoked.
 *
 * The token row is locked for the whole exchange. Without the lock, a losing request could
 * revoke the user's tokens before the winner inserted its new one, and that one would live.
 */
export async function refreshSession(deps: IdentityDeps, rawToken: string): Promise<Session> {
  const outcome = await deps.transaction(async (repos) => {
    const tx = { ...deps, ...repos };
    const now = deps.clock.now();
    const stored = await repos.refreshTokens.findByHash(deps.secrets.hash(rawToken), {
      forUpdate: true,
    });
    if (!stored) return null;

    if (stored.revokedAt || !(await repos.refreshTokens.revoke(stored.id, now))) {
      // committed, not rolled back: the revoke must outlive the error we answer with
      await repos.refreshTokens.revokeAllForUser(stored.userId, now);
      return null;
    }
    if (stored.expiresAt <= now) return null;

    const user = await repos.users.findById(stored.userId);
    return user ? issueSession(tx, user) : null;
  });
  if (!outcome) throw invalid();
  return outcome;
}
