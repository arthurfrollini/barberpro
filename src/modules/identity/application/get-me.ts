import { DomainError } from '../../../shared/domain/domain-error.js';
import type { User } from '../domain/user.js';
import type { IdentityDeps } from './ports.js';

export async function getMe(deps: Pick<IdentityDeps, 'users'>, userId: string): Promise<User> {
  const user = await deps.users.findById(userId);
  // a valid token for a deleted account is treated as no session at all
  if (!user) throw new DomainError('UNAUTHENTICATED', 'Sign in to continue.');
  return user;
}
