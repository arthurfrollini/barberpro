import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A notification says "booked for 14:00"; if the appointment later moves, the old entry must
 * still say 14:00. The time is kept on the notification itself. Existing rows take the
 * appointment's current time, the best value left for them.
 */
export class NotificationStartsAt1793460000000 implements MigrationInterface {
  name = 'NotificationStartsAt1793460000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE notifications ADD COLUMN appointment_starts_at timestamptz');
    await q.query(`
      UPDATE notifications n SET appointment_starts_at = a.starts_at
      FROM appointments a WHERE a.id = n.appointment_id`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE notifications DROP COLUMN appointment_starts_at');
  }
}
