import type { User } from '../domain/user.js';
import { getMe } from './get-me.js';
import type { IdentityDeps } from './ports.js';

export async function updateProfile(
  deps: Pick<IdentityDeps, 'users' | 'clock'>,
  userId: string,
  input: { name: string },
): Promise<User> {
  const user = await getMe(deps, userId);
  user.rename(input.name, deps.clock.now());
  await deps.users.save(user);
  return user;
}
