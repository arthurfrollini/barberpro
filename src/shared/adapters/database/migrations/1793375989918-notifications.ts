import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Notifications1793375989918 implements MigrationInterface {
  name = 'Notifications1793375989918';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE notifications (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(32) NOT NULL,
        title varchar(120) NOT NULL,
        body varchar(500) NOT NULL,
        appointment_id uuid REFERENCES appointments(id),
        read_at timestamptz,
        created_at timestamptz NOT NULL
      )`);
    await q.query(
      'CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC)',
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE notifications');
  }
}
