import type { Clock } from '../../../shared/application/clock.js';
import type {
  AccessTokens,
  IdentityDeps,
  PasswordHasher,
  RefreshTokenRepository,
  Secrets,
  StoredRefreshToken,
  UserRepository,
} from '../application/ports.js';
import type { Email } from '../domain/email.js';
import { User } from '../domain/user.js';

export class InMemoryUserRepository implements UserRepository {
  readonly rows = new Map<string, User>();

  async findById(id: string) {
    const user = this.rows.get(id);
    return user ? User.restore({ ...snapshot(user) }) : null;
  }
  async findByEmail(email: Email) {
    const user = [...this.rows.values()].find((u) => u.email.equals(email));
    return user ? User.restore({ ...snapshot(user) }) : null;
  }
  async save(user: User) {
    this.rows.set(user.id, User.restore(snapshot(user)));
  }
}

const snapshot = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  passwordHash: u.passwordHash,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly rows = new Map<string, StoredRefreshToken>();

  async create(token: Omit<StoredRefreshToken, 'revokedAt'>) {
    this.rows.set(token.id, { ...token, revokedAt: null });
  }
  async findByHash(tokenHash: string) {
    const row = [...this.rows.values()].find((t) => t.tokenHash === tokenHash);
    return row ? { ...row } : null;
  }
  async revoke(id: string, at: Date) {
    const row = this.rows.get(id);
    if (!row || row.revokedAt) return false;
    row.revokedAt = at;
    return true;
  }
  async revokeAllForUser(userId: string, at: Date) {
    for (const row of this.rows.values()) {
      if (row.userId === userId && !row.revokedAt) row.revokedAt = at;
    }
  }
}

export const fakeHasher: PasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (hash, plain) => hash === `hashed:${plain}`,
};

export function fakeAccessTokens(clock: Clock, ttlSeconds = 900): AccessTokens {
  return {
    issue: async (userId) => ({
      token: `access:${userId}`,
      expiresAt: new Date(clock.now().getTime() + ttlSeconds * 1000),
    }),
    verify: async (token) => (token.startsWith('access:') ? token.slice(7) : null),
  };
}

export function fakeSecrets(): Secrets {
  let n = 0;
  return { random: () => `secret-${++n}`, hash: (raw) => `h(${raw})` };
}

export function inMemoryIdentityDeps(clock: Clock) {
  return {
    users: new InMemoryUserRepository(),
    refreshTokens: new InMemoryRefreshTokenRepository(),
    hasher: fakeHasher,
    accessTokens: fakeAccessTokens(clock),
    secrets: fakeSecrets(),
    clock,
    refreshTokenTtlDays: 30,
  } satisfies IdentityDeps;
}
