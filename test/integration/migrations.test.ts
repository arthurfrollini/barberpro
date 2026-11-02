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
});
