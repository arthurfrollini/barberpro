import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Scheduling1793375502792 implements MigrationInterface {
  name = 'Scheduling1793375502792';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE weekly_intervals (
        barber_id uuid NOT NULL REFERENCES barbers(id),
        weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        start_minute smallint NOT NULL CHECK (start_minute BETWEEN 0 AND 1440),
        end_minute smallint NOT NULL CHECK (end_minute BETWEEN 0 AND 1440),
        PRIMARY KEY (barber_id, weekday, start_minute),
        CHECK (start_minute < end_minute)
      )`);

    await q.query(`
      CREATE TABLE blocked_dates (
        barber_id uuid NOT NULL REFERENCES barbers(id),
        date date NOT NULL,
        PRIMARY KEY (barber_id, date)
      )`);

    await q.query(`
      CREATE TABLE appointments (
        id uuid PRIMARY KEY,
        barber_id uuid NOT NULL REFERENCES barbers(id),
        customer_id uuid NOT NULL REFERENCES users(id),
        service_id uuid NOT NULL REFERENCES services(id),
        service_name varchar(60) NOT NULL,
        price_cents integer NOT NULL,
        duration_minutes integer NOT NULL,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        reminder_lead_minutes smallint,
        status varchar(16) NOT NULL CHECK (status IN ('booked', 'canceled')),
        cancel_reason varchar(32),
        canceled_by uuid REFERENCES users(id),
        canceled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK (ends_at > starts_at),
        -- the last word on double booking: two booked appointments of the same barber, or of
        -- the same customer, can never overlap, whatever the application checked before
        CONSTRAINT appointments_barber_no_overlap
          EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
          WHERE (status = 'booked'),
        CONSTRAINT appointments_customer_no_overlap
          EXCLUDE USING gist (customer_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
          WHERE (status = 'booked')
      )`);
    await q.query(
      'CREATE INDEX appointments_barber_starts_idx ON appointments (barber_id, starts_at)',
    );
    await q.query(
      'CREATE INDEX appointments_customer_starts_idx ON appointments (customer_id, starts_at)',
    );
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of ['appointments', 'blocked_dates', 'weekly_intervals']) {
      await q.query(`DROP TABLE ${table}`);
    }
  }
}
