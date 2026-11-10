import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One row per install of the app: the Expo push token is the key, so a phone that signs in as
 * someone else moves to them instead of getting both people's notifications.
 */
export class PushTokens1793900000000 implements MigrationInterface {
  name = 'PushTokens1793900000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE push_tokens (
        token varchar(255) PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform varchar(10) NOT NULL CHECK (platform IN ('ios', 'android')),
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )`);
    await q.query('CREATE INDEX push_tokens_user_id ON push_tokens (user_id)');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE push_tokens');
  }
}
