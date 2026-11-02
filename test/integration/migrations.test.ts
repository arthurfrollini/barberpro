import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestDataSource, testDataSource } from '../support/db.js';

describe('migrations', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await testDataSource();
  });
  afterAll(closeTestDataSource);

  it('install the extensions the schema relies on', async () => {
    const rows: { extname: string }[] = await ds.query('SELECT extname FROM pg_extension');
    const names = rows.map((r) => r.extname);

    expect(names).toEqual(expect.arrayContaining(['postgis', 'btree_gist', 'pg_trgm']));
  });

  it('create the identity tables', async () => {
    const rows: { table_name: string }[] = await ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = rows.map((r) => r.table_name);

    expect(names).toEqual(expect.arrayContaining(['users', 'refresh_tokens']));
  });

  it('let a person barber in many shops, but never at two places at once', async () => {
    const indexes: { indexname: string }[] = await ds.query(
      `SELECT indexname FROM pg_indexes WHERE tablename IN ('barbers', 'barbershops')`,
    );
    const names = indexes.map((i) => i.indexname);
    expect(names).toEqual(
      expect.arrayContaining(['barbers_active_user_shop_idx', 'barbershops_owner_idx']),
    );
    expect(names).not.toContain('barbers_active_user_idx');
    const constraints: { conname: string }[] = await ds.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'appointments'::regclass`,
    );
    expect(constraints.map((c) => c.conname)).toContain('appointments_barber_user_no_overlap');
  });
});
