import Fastify, { type FastifyInstance } from 'fastify';
import type { Container } from './container.js';
import { identityGraphQL } from './modules/identity/adapters/graphql/identity.resolvers.js';
import { logSafeError } from './shared/adapters/log-safe-error.js';
import { createGraphQLServer } from './shared/adapters/graphql/yoga.js';
import { registerHealthRoute } from './shared/adapters/http/health.js';

export async function buildApp(container: Container): Promise<FastifyInstance> {
  const app = Fastify({
    logger: container.config.nodeEnv === 'test' ? false : { level: 'info' },
  });

  registerHealthRoute(app, container.healthChecks);

  const { accessTokens } = container.identity;
  const yoga = createGraphQLServer({
    modules: [identityGraphQL(container.identity)],
    context: async (request) => {
      const header = request.headers.get('authorization') ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      return { currentUserId: token ? await accessTokens.verify(token) : null };
    },
    logError: (error) => app.log.error({ error: logSafeError(error) }, 'unexpected GraphQL error'),
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
