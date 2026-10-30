import type { CodegenConfig } from '@graphql-codegen/cli';

// Turns the SDL files into resolver types, so a resolver that returns the wrong shape
// fails `npm run typecheck`. Run `npm run codegen` after editing any .graphql file.
const config: CodegenConfig = {
  schema: 'src/**/*.graphql',
  generates: {
    'src/shared/adapters/graphql/generated/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context.js#GraphQLContext',
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: { DateTime: 'Date' },
        // resolvers return domain objects; codegen checks the fields the SDL adds on top
        mapperTypeSuffix: 'Model',
        mappers: {
          User: '../../../../modules/identity/domain/user.js#User',
          AuthPayload: '../../../../modules/identity/application/ports.js#Session',
        },
      },
    },
  },
};

export default config;
