import { type EntityManager, In } from 'typeorm';
import type { PushTokenRepository, SavePushToken } from '../../application/ports.js';
import { PushTokenRecord } from './push-token.record.js';

export class TypeOrmPushTokenRepository implements PushTokenRepository {
  constructor(private readonly manager: EntityManager) {}

  async save({ token, userId, platform, at }: SavePushToken) {
    // the same phone again (or signed in as someone else): update the owner, keep created_at
    await this.manager.query(
      `INSERT INTO push_tokens (token, user_id, platform, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = EXCLUDED.updated_at`,
      [token, userId, platform, at],
    );
  }

  async remove(token: string, userId: string | null) {
    const result = await this.manager.delete(
      PushTokenRecord,
      userId === null ? { token } : { token, userId },
    );
    return (result.affected ?? 0) > 0;
  }

  async forUser(userId: string) {
    const rows = await this.manager.find(PushTokenRecord, {
      where: { userId },
      order: { createdAt: 'ASC', token: 'ASC' },
    });
    return rows.map((r) => ({ token: r.token, platform: r.platform }));
  }

  async removeTokens(tokens: string[]) {
    if (tokens.length === 0) return;
    await this.manager.delete(PushTokenRecord, { token: In(tokens) });
  }
}
