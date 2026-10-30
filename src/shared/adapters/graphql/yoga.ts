import { createSchema, createYoga, type YogaServerInstance } from 'graphql-yoga';
import type { GraphQLContext } from './context.js';
import { DateTimeScalar } from './date-time.js';
import type { Resolvers } from './generated/resolvers.js';
import { createMaskError } from './mask-error.js';
import { loadSdl } from './sdl.js';

/** Each module contributes its SDL file and the resolvers for it. */
export type GraphQLModule = { typeDefs: string; resolvers: Resolvers };

const baseModule: GraphQLModule = {
  typeDefs: loadSdl(import.meta.url, 'base.graphql'),
  resolvers: { DateTime: DateTimeScalar, Query: { health: () => 'ok' } },
};

export type GraphQLServer = YogaServerInstance<object, GraphQLContext>;

export function createGraphQLServer(options: {
  modules: GraphQLModule[];
  context: (request: Request) => Promise<GraphQLContext>;
  logError: (error: unknown) => void;
  graphiql?: boolean;
}): GraphQLServer {
  const modules = [baseModule, ...options.modules];
  return createYoga<object, GraphQLContext>({
    schema: createSchema<GraphQLContext>({
      typeDefs: modules.map((m) => m.typeDefs),
      resolvers: modules.map((m) => m.resolvers),
    }),
    context: ({ request }) => options.context(request),
    maskedErrors: { maskError: createMaskError(options.logError) },
    graphiql: options.graphiql ?? false,
    logging: false,
  });
}
