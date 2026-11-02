import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Shops1793374278141 implements MigrationInterface {
  name = 'Shops1793374278141';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE files (
        id uuid PRIMARY KEY,
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type varchar(32) NOT NULL,
        size_bytes integer NOT NULL CHECK (size_bytes > 0),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE barbershops (
        id uuid PRIMARY KEY,
        owner_id uuid NOT NULL UNIQUE REFERENCES users(id),
        name varchar(80) NOT NULL,
        description varchar(1000) NOT NULL DEFAULT '',
        founded_year integer NOT NULL,
        logo_file_id uuid REFERENCES files(id),
        address varchar(200) NOT NULL,
        location geography(Point, 4326) NOT NULL,
        timezone varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    // nearest shops: ST_DWithin / ORDER BY distance use this index
    await q.query('CREATE INDEX barbershops_location_idx ON barbershops USING gist (location)');
    // search by name, tolerant to typos and accents left out
    await q.query(
      'CREATE INDEX barbershops_name_trgm_idx ON barbershops USING gin (lower(name) gin_trgm_ops)',
    );

    await q.query(`
      CREATE TABLE barbers (
        id uuid PRIMARY KEY,
        shop_id uuid NOT NULL REFERENCES barbershops(id),
        user_id uuid NOT NULL REFERENCES users(id),
        bio varchar(500) NOT NULL DEFAULT '',
        avatar_file_id uuid REFERENCES files(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        removed_at timestamptz
      )`);
    // one active shop per barber; removed rows stay for the appointment history
    await q.query(
      'CREATE UNIQUE INDEX barbers_active_user_idx ON barbers (user_id) WHERE removed_at IS NULL',
    );
    await q.query('CREATE INDEX barbers_shop_id_idx ON barbers (shop_id)');

    await q.query(`
      CREATE TABLE invites (
        id uuid PRIMARY KEY,
        shop_id uuid NOT NULL REFERENCES barbershops(id),
        email varchar(254) NOT NULL,
        token_hash char(64) NOT NULL UNIQUE,
        invited_by uuid NOT NULL REFERENCES users(id),
        expires_at timestamptz NOT NULL,
        accepted_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`
      CREATE UNIQUE INDEX invites_open_idx ON invites (shop_id, email)
      WHERE accepted_at IS NULL AND revoked_at IS NULL`);

    await q.query(`
      CREATE TABLE services (
        id uuid PRIMARY KEY,
        barber_id uuid NOT NULL REFERENCES barbers(id),
        name varchar(60) NOT NULL,
        description varchar(500) NOT NULL DEFAULT '',
        price_cents integer NOT NULL CHECK (price_cents >= 0),
        duration_minutes integer NOT NULL
          CHECK (duration_minutes BETWEEN 5 AND 480 AND duration_minutes % 5 = 0),
        archived_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query('CREATE INDEX services_barber_id_idx ON services (barber_id)');
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of ['services', 'invites', 'barbers', 'barbershops', 'files']) {
      await q.query(`DROP TABLE ${table}`);
    }
  }
}
