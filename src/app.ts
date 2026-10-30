import Fastify, { type FastifyInstance } from 'fastify';
import type { Container } from './container.js';
import { schedulingGraphQL } from './modules/scheduling/adapters/graphql/scheduling.resolvers.js';
import { notificationsGraphQL } from './modules/notifications/adapters/graphql/notifications.resolvers.js';
import { identityGraphQL } from './modules/identity/adapters/graphql/identity.resolvers.js';
import { shopsGraphQL } from './modules/shops/adapters/graphql/shops.resolvers.js';
import { logSafeError } from './shared/adapters/log-safe-error.js';
import { createLoaders } from './shared/adapters/graphql/loaders.js';
import { createGraphQLServer } from './shared/adapters/graphql/yoga.js';
import { registerUploadRoutes } from './shared/adapters/files/uploads-routes.js';
import { registerHealthRoute } from './shared/adapters/http/health.js';

export async function buildApp(container: Container): Promise<FastifyInstance> {
  const app = Fastify({
    logger: container.config.nodeEnv === 'test' ? false : { level: 'info' },
  });

  const { accessTokens } = container.identity;
  const authenticate = async (authorization: string | null | undefined) => {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    return token ? accessTokens.verify(token) : null;
  };

  registerHealthRoute(app, container.healthChecks);
  await registerUploadRoutes(app, {
    ...container.files,
    authenticate,
    publicUrl: container.config.publicUrl,
  });

  const yoga = createGraphQLServer({
    modules: [
      identityGraphQL(container.identity),
      shopsGraphQL(container.shops, container.config.publicUrl),
      schedulingGraphQL(container.scheduling),
      notificationsGraphQL(container.notifications, container.scheduling, container.pubSub),
    ],
    context: async (request) => ({
      currentUserId: await authenticate(request.headers.get('authorization')),
      loaders: createLoaders(container),
    }),
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
