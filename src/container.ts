import { Redis } from 'ioredis';
import type { DataSource, EntityManager } from 'typeorm';
import type { Config } from './config.js';
import { TypeOrmRefreshTokenRepository } from './modules/identity/adapters/persistence/typeorm-refresh-token-repository.js';
import { TypeOrmUserRepository } from './modules/identity/adapters/persistence/typeorm-user-repository.js';
import { Argon2PasswordHasher } from './modules/identity/adapters/security/argon2-password-hasher.js';
import { JoseAccessTokens } from './modules/identity/adapters/security/jose-access-tokens.js';
import { nodeSecrets } from './modules/identity/adapters/security/node-secrets.js';
import type { IdentityDeps } from './modules/identity/application/ports.js';
import { createDataSource } from './shared/adapters/database/data-source.js';
import { detectImageType } from './shared/adapters/files/detect-image-type.js';
import { DiskFileStorage } from './shared/adapters/files/disk-file-storage.js';
import { TypeOrmFileRepository } from './shared/adapters/files/typeorm-file-repository.js';
import type { HealthChecks } from './shared/adapters/http/health.js';
import { type Clock, systemClock } from './shared/application/clock.js';
import type { FileDeps } from './shared/application/files.js';

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
  identity: IdentityDeps;
  files: FileDeps;
  close(): Promise<void>;
};

export type ContainerOptions = {
  /** Tests pass a FixedClock to control "now". */
  clock?: Clock;
};

export async function createContainer(
  config: Config,
  options: ContainerOptions = {},
): Promise<Container> {
  const clock = options.clock ?? systemClock;
  const dataSource = createDataSource(config.databaseUrl);
  await dataSource.initialize();
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });

  const identityRepositories = (manager: EntityManager) => ({
    users: new TypeOrmUserRepository(manager),
    refreshTokens: new TypeOrmRefreshTokenRepository(manager),
  });
  const identity: IdentityDeps = {
    ...identityRepositories(dataSource.manager),
    transaction: (work) => dataSource.transaction((manager) => work(identityRepositories(manager))),
    hasher: new Argon2PasswordHasher(),
    accessTokens: new JoseAccessTokens(config.jwtSecret, config.accessTokenTtlSeconds, clock),
    secrets: nodeSecrets,
    clock,
    refreshTokenTtlDays: config.refreshTokenTtlDays,
  };

  const files: FileDeps = {
    files: new TypeOrmFileRepository(dataSource.manager),
    storage: new DiskFileStorage(config.uploadDir),
    clock,
    detectType: detectImageType,
  };

  return {
    config,
    clock,
    dataSource,
    redis,
    healthChecks: {
      postgres: () => dataSource.query('SELECT 1'),
      redis: () => redis.ping(),
    },
    identity,
    files,
    async close() {
      redis.disconnect();
      await dataSource.destroy();
    },
  };
}
