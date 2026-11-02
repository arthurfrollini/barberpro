import { DomainError } from '../../../shared/domain/domain-error.js';
import { Email } from '../domain/email.js';
import { issueSession } from './issue-session.js';
import type { IdentityDeps, Session } from './ports.js';

// one error for both cases, so the message alone does not tell which emails have an account
const invalid = () => new DomainError('INVALID_CREDENTIALS', 'Email or password is incorrect.');

export async function signIn(
  deps: IdentityDeps,
  input: { email: string; password: string },
): Promise<Session> {
  let email: Email;
  try {
    email = Email.parse(input.email);
  } catch {
    throw invalid();
  }
  const user = await deps.users.findByEmail(email);
  if (!user || !(await deps.hasher.verify(user.passwordHash, input.password))) {
    throw invalid();
  }
  return issueSession(deps, user);
}
