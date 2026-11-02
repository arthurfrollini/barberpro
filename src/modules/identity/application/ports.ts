import type { Clock } from '../../../shared/application/clock.js';
import type { Email } from '../domain/email.js';
import type { User } from '../domain/user.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByIds(ids: readonly string[]): Promise<User[]>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}

export type StoredRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface RefreshTokenRepository {
  create(token: Omit<StoredRefreshToken, 'revokedAt'>): Promise<void>;
  /** `forUpdate` locks the row until the surrounding transaction ends. */
  findByHash(
    tokenHash: string,
    options?: { forUpdate?: boolean },
  ): Promise<StoredRefreshToken | null>;
  /** Revokes the token only if it is still active; false means someone used it first. */
  revoke(id: string, at: Date): Promise<boolean>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface AccessTokens {
  issue(userId: string): Promise<{ token: string; expiresAt: Date }>;
  /** The user id inside a valid, unexpired token; null for anything else. */
  verify(token: string): Promise<string | null>;
}

/** Opaque random tokens (refresh tokens, invites) and the hash stored in their place. */
export interface Secrets {
  random(): string;
  hash(raw: string): string;
}

export type IdentityRepositories = {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
};

export type IdentityDeps = {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  hasher: PasswordHasher;
  accessTokens: AccessTokens;
  secrets: Secrets;
  clock: Clock;
  refreshTokenTtlDays: number;
  /** Runs `work` in one database transaction, with repositories bound to it. */
  transaction<T>(work: (repos: IdentityRepositories) => Promise<T>): Promise<T>;
};

export type Session = {
  user: User;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
};
