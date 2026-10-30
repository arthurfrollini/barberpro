import Fastify, { type FastifyInstance } from 'fastify';
import type { Container } from './container.js';
import { createGraphQLServer } from './shared/adapters/graphql/yoga.js';
import { registerHealthRoute } from './shared/adapters/http/health.js';

export async function buildApp(container: Container): Promise<FastifyInstance> {
  const app = Fastify({
    logger: container.config.nodeEnv === 'test' ? false : { level: 'info' },
  });

  registerHealthRoute(app, container.healthChecks);

  const yoga = createGraphQLServer({
    modules: [],
    context: async () => ({ currentUserId: null }),
    logError: (error) => app.log.error({ err: error }, 'unexpected GraphQL error'),
    graphiql: container.config.nodeEnv !== 'production',
  });
  app.route({
    url: yoga.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (request, reply) => yoga.handleNodeRequestAndResponse(request, reply),
  });

  await app.ready();
  return app;
}
