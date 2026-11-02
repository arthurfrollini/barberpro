import { DataSource, type DataSourceOptions } from 'typeorm';
import { RefreshTokenRecord } from '../../../modules/identity/adapters/persistence/refresh-token.record.js';
import { UserRecord } from '../../../modules/identity/adapters/persistence/user.record.js';
import { Identity1793373465720 } from './migrations/1793373465720-identity.js';

// Listed by hand instead of globs: explicit, and it works the same under tsx, tsc and Vitest.
const entities: NonNullable<DataSourceOptions['entities']> = [UserRecord, RefreshTokenRecord];
const migrations = [Identity1793373465720];

export function createDataSource(url: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url,
    entities,
    migrations,
    synchronize: false,
    // a null or undefined in a where clause is almost always a bug, not "match everything"
    invalidWhereValuesBehavior: { null: 'throw', undefined: 'throw' },
  });
}
