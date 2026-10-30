import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer, type Container, type ContainerOptions } from '../../src/container.js';
import { truncateAll } from './db.js';

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
