import Fastify, { type FastifyInstance } from 'fastify';
import type { Container } from './container.js';
import { registerHealthRoute } from './shared/adapters/http/health.js';

export async function buildApp(container: Container): Promise<FastifyInstance> {
  const app = Fastify({
    logger: container.config.nodeEnv === 'test' ? false : { level: 'info' },
  });

  registerHealthRoute(app, container.healthChecks);

  await app.ready();
  return app;
}
