import { DataSource, type DataSourceOptions } from 'typeorm';
import { RefreshTokenRecord } from '../../../modules/identity/adapters/persistence/refresh-token.record.js';
import { UserRecord } from '../../../modules/identity/adapters/persistence/user.record.js';
import { NotificationRecord } from '../../../modules/notifications/adapters/persistence/notification.record.js';
import { schedulingRecords } from '../../../modules/scheduling/adapters/persistence/records.js';
import { shopsRecords } from '../../../modules/shops/adapters/persistence/records.js';
import { FileRecord } from '../files/file.record.js';
import { Identity1793373465720 } from './migrations/1793373465720-identity.js';
import { Notifications1793375989918 } from './migrations/1793375989918-notifications.js';
import { NotificationStartsAt1793460000000 } from './migrations/1793460000000-notification-starts-at.js';
import { Scheduling1793375502792 } from './migrations/1793375502792-scheduling.js';
import { Shops1793374278141 } from './migrations/1793374278141-shops.js';

// Listed by hand instead of globs: explicit, and it works the same under tsx, tsc and Vitest.
const entities: NonNullable<DataSourceOptions['entities']> = [
  UserRecord,
  RefreshTokenRecord,
  FileRecord,
  ...shopsRecords,
  ...schedulingRecords,
  NotificationRecord,
];
const migrations = [
  Identity1793373465720,
  Shops1793374278141,
  Scheduling1793375502792,
  Notifications1793375989918,
  NotificationStartsAt1793460000000,
];

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
