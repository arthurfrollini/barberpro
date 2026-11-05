import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'dist-web', 'src/gql', '.expo', 'playwright-report', 'test-results'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // only the shared API layer talks to the network
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/api/**', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use the client in @/shared/api.' },
      ],
    },
  },
  {
    // screens and components reach the network through their feature's hooks
    files: ['src/app/**', 'src/features/*/components/**', 'src/features/*/screens/**'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/api/*', '!@/shared/api'], message: 'Use a hook.' }] },
      ],
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'e2e/**/*.{ts,mjs}', 'jest.setup.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.jest } },
  },
  prettier,
);
