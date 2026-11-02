import type { CodegenConfig } from '@graphql-codegen/cli';

// The schema comes straight from the API's SDL files, so a breaking API change fails here.
const config: CodegenConfig = {
  schema: '../src/**/*.graphql',
  documents: ['src/features/**/api/*.ts', 'src/shared/api/*.ts', '!src/**/*.test.ts'],
  ignoreNoDocuments: true,
  generates: {
    'src/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
        scalars: { DateTime: 'string' },
        skipTypename: true,
      },
    },
  },
  hooks: { afterAllFileWrite: ['prettier --write'] },
};

export default config;
