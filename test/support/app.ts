import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer, type Container, type ContainerOptions } from '../../src/container.js';
import { truncateAll } from './db.js';

/** Drops the test prefix's BullMQ keys, so jobs from earlier runs don't pile up in Redis. */
async function clearQueues(container: Container): Promise<void> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await container.redis.scan(
      cursor,
      'MATCH',
      `${container.config.queuePrefix}:*`,
      'COUNT',
      500,
    );
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  if (keys.length > 0) await container.redis.del(...keys);
}

export type TestApp = { app: FastifyInstance; container: Container; close(): Promise<void> };

/**
 * The real app on the test database, migrated and emptied. `customize` swaps parts of the
 * container (a fake clock, a failing dependency) before the app is built.
 */
export async function createTestApp(
  customize?: (c: Container) => void,
  options: ContainerOptions = {},
): Promise<TestApp> {
  const container = await createContainer(loadConfig(process.env), options);
  await container.dataSource.runMigrations();
  await truncateAll(container.dataSource);
  await clearQueues(container);
  customize?.(container);
  const app = await buildApp(container);
  return {
    app,
    container,
    async close() {
      await app.close();
      await container.close();
    },
  };
}
