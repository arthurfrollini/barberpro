import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../shared/testing/fixed-clock.js';
import { inMemoryIdentityDeps } from '../testing/in-memory.js';
import { getMe } from './get-me.js';
import { refreshSession } from './refresh-session.js';
import { signIn } from './sign-in.js';
import { signUp } from './sign-up.js';
import { updateProfile } from './update-profile.js';

const code = (c: string) => expect.objectContaining({ code: c });

describe('identity use cases', () => {
  let clock: FixedClock;
  let deps: ReturnType<typeof inMemoryIdentityDeps>;

  beforeEach(() => {
    clock = new FixedClock(new Date('2026-11-02T12:00:00Z'));
    deps = inMemoryIdentityDeps(clock);
  });

  const ana = { name: 'Ana', email: 'Ana@X.com', password: 'correct horse' };

  describe('signUp', () => {
    it('creates the user with a hashed password and opens a session', async () => {
      const session = await signUp(deps, ana);

      expect(session.user.email.value).toBe('ana@x.com');
      expect(session.user.passwordHash).not.toBe(ana.password);
      expect(await deps.hasher.verify(session.user.passwordHash, ana.password)).toBe(true);
      expect(await deps.accessTokens.verify(session.accessToken)).toBe(session.user.id);
      expect(session.accessTokenExpiresAt).toEqual(new Date('2026-11-02T12:15:00Z'));
      expect(session.refreshToken).toBeTruthy();
    });

    it('rejects an email already taken, whatever the case', async () => {
      await signUp(deps, ana);

      await expect(signUp(deps, { ...ana, email: 'ana@x.com' })).rejects.toEqual(
        code('EMAIL_TAKEN'),
      );
    });

    it('checks the password policy', async () => {
      await expect(signUp(deps, { ...ana, password: 'short' })).rejects.toEqual(
        code('WEAK_PASSWORD'),
      );
    });
  });

  describe('signIn', () => {
    beforeEach(() => signUp(deps, ana));

    it('accepts the email in any case', async () => {
      const session = await signIn(deps, { email: 'ANA@x.com', password: ana.password });

      expect(session.user.email.value).toBe('ana@x.com');
    });

    it('gives the same error for an unknown email and a wrong password', async () => {
      await expect(signIn(deps, { email: 'bob@x.com', password: ana.password })).rejects.toEqual(
        code('INVALID_CREDENTIALS'),
      );
      await expect(signIn(deps, { email: ana.email, password: 'wrong pass' })).rejects.toEqual(
        code('INVALID_CREDENTIALS'),
      );
    });
  });

  describe('refreshSession', () => {
    it('swaps the refresh token for a new session and retires the old token', async () => {
      const first = await signUp(deps, ana);

      const second = await refreshSession(deps, first.refreshToken);

      expect(second.user.id).toBe(first.user.id);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await expect(refreshSession(deps, first.refreshToken)).rejects.toEqual(
        code('INVALID_REFRESH_TOKEN'),
      );
    });

    it('revokes every session of the user when a retired token is reused', async () => {
      const first = await signUp(deps, ana);
      const second = await refreshSession(deps, first.refreshToken);

      await expect(refreshSession(deps, first.refreshToken)).rejects.toEqual(
        code('INVALID_REFRESH_TOKEN'),
      );

      await expect(refreshSession(deps, second.refreshToken)).rejects.toEqual(
        code('INVALID_REFRESH_TOKEN'),
      );
    });

    it('rejects an expired token', async () => {
      const first = await signUp(deps, ana);
      clock.advanceMinutes(30 * 24 * 60);

      await expect(refreshSession(deps, first.refreshToken)).rejects.toEqual(
        code('INVALID_REFRESH_TOKEN'),
      );
    });

    it('rejects an unknown token', async () => {
      await expect(refreshSession(deps, 'nope')).rejects.toEqual(code('INVALID_REFRESH_TOKEN'));
    });
  });

  describe('profile', () => {
    it('getMe returns the user, and UNAUTHENTICATED once the user is gone', async () => {
      const { user } = await signUp(deps, ana);

      expect((await getMe(deps, user.id)).name).toBe('Ana');
      await expect(getMe(deps, '00000000-0000-0000-0000-000000000000')).rejects.toEqual(
        code('UNAUTHENTICATED'),
      );
    });

    it('updateProfile renames the user', async () => {
      const { user } = await signUp(deps, ana);
      clock.advanceMinutes(5);

      const updated = await updateProfile(deps, user.id, { name: 'Ana Souza' });

      expect(updated.name).toBe('Ana Souza');
      expect((await deps.users.findById(user.id))?.name).toBe('Ana Souza');
      expect(updated.updatedAt).toEqual(clock.now());
    });
  });
});
