import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Identity1793373465720 implements MigrationInterface {
  name = 'Identity1793373465720';

  async up(q: QueryRunner): Promise<void> {
    // postgis: "nearest shops"; btree_gist: overlap constraints on appointments; pg_trgm: shop search
    await q.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await q.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await q.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await q.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(80) NOT NULL,
        email varchar(254) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash char(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query('CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id)');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE refresh_tokens');
    await q.query('DROP TABLE users');
  }
}
