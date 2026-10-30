import { Redis } from 'ioredis';
import type { DataSource } from 'typeorm';
import type { Config } from './config.js';
import { createDataSource } from './shared/adapters/database/data-source.js';
import type { HealthChecks } from './shared/adapters/http/health.js';
import { type Clock, systemClock } from './shared/application/clock.js';

/**
 * The composition root: the one place that knows which adapter implements which port.
 * Wired by hand on purpose; a DI container would hide this in decorators.
 */
export type Container = {
  config: Config;
  clock: Clock;
  dataSource: DataSource;
  redis: Redis;
  healthChecks: HealthChecks;
  close(): Promise<void>;
};

export async function createContainer(config: Config): Promise<Container> {
  const dataSource = createDataSource(config.databaseUrl);
  await dataSource.initialize();
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });

  return {
    config,
    clock: systemClock,
    dataSource,
    redis,
    healthChecks: {
      postgres: () => dataSource.query('SELECT 1'),
      redis: () => redis.ping(),
    },
    async close() {
      redis.disconnect();
      await dataSource.destroy();
    },
  };
}
