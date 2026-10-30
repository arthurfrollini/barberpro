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
      },
    },
  },
};

export default config;
