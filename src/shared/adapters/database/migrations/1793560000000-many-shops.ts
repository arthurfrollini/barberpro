import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * V2: an owner may have many shops and a person may barber in many (one profile per shop).
 * A person still cannot be in two places: a third exclusion constraint keeps one person's
 * booked appointments from overlapping across all of their shops.
 */
export class ManyShops1793560000000 implements MigrationInterface {
  name = 'ManyShops1793560000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE barbershops DROP CONSTRAINT barbershops_owner_id_key');
    await q.query('CREATE INDEX barbershops_owner_idx ON barbershops (owner_id)');

    await q.query('DROP INDEX barbers_active_user_idx');
    await q.query(
      'CREATE UNIQUE INDEX barbers_active_user_shop_idx ON barbers (user_id, shop_id) WHERE removed_at IS NULL',
    );

    await q.query('ALTER TABLE appointments ADD COLUMN barber_user_id uuid REFERENCES users(id)');
    await q.query(`
      UPDATE appointments a SET barber_user_id = b.user_id
      FROM barbers b WHERE b.id = a.barber_id`);
    await q.query('ALTER TABLE appointments ALTER COLUMN barber_user_id SET NOT NULL');
    await q.query(`
      ALTER TABLE appointments ADD CONSTRAINT appointments_barber_user_no_overlap
        EXCLUDE USING gist (barber_user_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
        WHERE (status = 'booked')`);
  }

  /** Fails once someone owns two shops or barbers in two: v1's limits no longer fit the data. */
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE appointments DROP CONSTRAINT appointments_barber_user_no_overlap');
    await q.query('ALTER TABLE appointments DROP COLUMN barber_user_id');
    await q.query('DROP INDEX barbers_active_user_shop_idx');
    await q.query(
      'CREATE UNIQUE INDEX barbers_active_user_idx ON barbers (user_id) WHERE removed_at IS NULL',
    );
    await q.query('DROP INDEX barbershops_owner_idx');
    await q.query(
      'ALTER TABLE barbershops ADD CONSTRAINT barbershops_owner_id_key UNIQUE (owner_id)',
    );
  }
}
