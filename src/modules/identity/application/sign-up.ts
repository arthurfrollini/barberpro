import { DomainError } from '../../../shared/domain/domain-error.js';
import { Email } from '../domain/email.js';
import { assertPasswordPolicy } from '../domain/password.js';
import { User } from '../domain/user.js';
import { issueSession } from './issue-session.js';
import type { IdentityDeps, Session } from './ports.js';

export async function signUp(
  deps: IdentityDeps,
  input: { name: string; email: string; password: string },
): Promise<Session> {
  const email = Email.parse(input.email);
  assertPasswordPolicy(input.password);
  if (await deps.users.findByEmail(email)) {
    throw new DomainError('EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const user = User.create({
    name: input.name,
    email,
    passwordHash: await deps.hasher.hash(input.password),
    now: deps.clock.now(),
  });
  await deps.users.save(user);
  return issueSession(deps, user);
}
