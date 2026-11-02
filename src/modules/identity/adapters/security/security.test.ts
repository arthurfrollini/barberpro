import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../../../shared/testing/fixed-clock.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';
import { JoseAccessTokens } from './jose-access-tokens.js';
import { nodeSecrets } from './node-secrets.js';

const SECRET = 'x'.repeat(32);

describe('Argon2PasswordHasher', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash('correct horse');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await hasher.verify(hash, 'correct horse')).toBe(true);
    expect(await hasher.verify(hash, 'wrong horse')).toBe(false);
  });

  it('answers false for a malformed hash instead of throwing', async () => {
    expect(await new Argon2PasswordHasher().verify('not-a-hash', 'x')).toBe(false);
  });
});

describe('JoseAccessTokens', () => {
  it('round-trips the user id until the token expires', async () => {
    const clock = new FixedClock(new Date('2026-11-02T12:00:00Z'));
    const tokens = new JoseAccessTokens(SECRET, 900, clock);

    const { token, expiresAt } = await tokens.issue('user-1');

    expect(expiresAt).toEqual(new Date('2026-11-02T12:15:00Z'));
    expect(await tokens.verify(token)).toBe('user-1');
    clock.advanceMinutes(16);
    expect(await tokens.verify(token)).toBeNull();
  });

  it('rejects a token signed with another secret, and garbage', async () => {
    const clock = new FixedClock();
    const { token } = await new JoseAccessTokens('y'.repeat(32), 900, clock).issue('user-1');
    const tokens = new JoseAccessTokens(SECRET, 900, clock);

    expect(await tokens.verify(token)).toBeNull();
    expect(await tokens.verify('garbage')).toBeNull();
  });
});

describe('nodeSecrets', () => {
  it('makes unguessable tokens and a 64-char sha256 hash', () => {
    const a = nodeSecrets.random();

    expect(a).not.toBe(nodeSecrets.random());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(nodeSecrets.hash(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(nodeSecrets.hash(a)).toBe(nodeSecrets.hash(a));
  });
});
