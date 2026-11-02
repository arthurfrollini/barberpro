import type { FastifyInstance } from 'fastify';

export type HealthChecks = Record<string, () => Promise<unknown>>;

/** GET /health: 200 when every dependency answers, 503 naming the ones that do not. */
export function registerHealthRoute(app: FastifyInstance, checks: HealthChecks): void {
  app.get('/health', async (_request, reply) => {
    const results = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          await check();
          return [name, 'up'] as const;
        } catch (error) {
          app.log.warn({ err: error, dependency: name }, 'health check failed');
          return [name, 'down'] as const;
        }
      }),
    );
    const healthy = results.every(([, state]) => state === 'up');
    return reply
      .code(healthy ? 200 : 503)
      .send({ status: healthy ? 'ok' : 'error', checks: Object.fromEntries(results) });
  });
}
