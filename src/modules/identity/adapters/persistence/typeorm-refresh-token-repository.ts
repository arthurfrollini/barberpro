import { type EntityManager, IsNull } from 'typeorm';
import type { RefreshTokenRepository, StoredRefreshToken } from '../../application/ports.js';
import { RefreshTokenRecord } from './refresh-token.record.js';

export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly manager: EntityManager) {}

  async create(token: Omit<StoredRefreshToken, 'revokedAt'>): Promise<void> {
    await this.manager.insert(RefreshTokenRecord, { ...token, revokedAt: null });
  }

  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const r = await this.manager.findOneBy(RefreshTokenRecord, { tokenHash });
    return r
      ? {
          id: r.id,
          userId: r.userId,
          tokenHash: r.tokenHash,
          expiresAt: r.expiresAt,
          revokedAt: r.revokedAt,
        }
      : null;
  }

  async revoke(id: string, at: Date): Promise<boolean> {
    // conditional UPDATE: of two concurrent refreshes with the same token, only one gets a row
    const result = await this.manager.update(
      RefreshTokenRecord,
      { id, revokedAt: IsNull() },
      { revokedAt: at },
    );
    return result.affected === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.manager.update(
      RefreshTokenRecord,
      { userId, revokedAt: IsNull() },
      { revokedAt: at },
    );
  }
}
