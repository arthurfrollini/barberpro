import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // graphql 17 ships a separate build under the "development" condition. Vite would pick it
  // for our code while Node loads the default build for graphql-yoga, giving two GraphQLError
  // classes. Pointing "graphql" at the file Node resolves keeps a single copy, as in production.
  resolve: {
    alias: [{ find: /^graphql$/, replacement: createRequire(import.meta.url).resolve('graphql') }],
  },
  test: {
    // `npm run test:coverage`: all three projects, measured over the source that ships
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/generated/**', 'src/**/migrations/**'],
      reporter: ['text-summary', 'text', 'html'],
    },
    projects: [
      {
        test: { name: 'unit', include: ['src/**/*.test.ts'] },
      },
      {
        // integration and e2e share one Postgres database, so their files run one at a time
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['test/support/env.ts'],
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          setupFiles: ['test/support/env.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
