import type { DataSource } from 'typeorm';
import { createDataSource } from '../../src/shared/adapters/database/data-source.js';

let ds: DataSource | undefined;

/** One migrated connection to the test database per test file. */
export async function testDataSource(): Promise<DataSource> {
  if (!ds) {
    ds = createDataSource(process.env.DATABASE_URL!);
    await ds.initialize();
    await ds.runMigrations();
  }
  return ds;
}

export async function closeTestDataSource(): Promise<void> {
  await ds?.destroy();
  ds = undefined;
}

/** Empties every table except the migrations log, so each test starts from zero rows. */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const rows: { tablename: string }[] = await dataSource.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename NOT IN ('migrations', 'spatial_ref_sys')`,
  );
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
