import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src/shared/adapters/graphql/generated'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // the domain and application layers must not know about frameworks
    files: ['src/**/domain/**/*.ts', 'src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'typeorm',
                'fastify',
                'graphql',
                'graphql-yoga',
                'ioredis',
                'bullmq',
                '**/adapters/**',
              ],
              message: 'Domain and application code must not import frameworks or adapters.',
            },
          ],
        },
      ],
    },
  },
  {
    // tests read loosely typed GraphQL responses
    files: ['test/**/*.ts', 'src/**/*.test.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
);
