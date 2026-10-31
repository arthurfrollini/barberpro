import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src/gql', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
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
    // shadcn components are generated code we own but keep close to upstream
    files: ['src/shared/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
