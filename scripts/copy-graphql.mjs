// tsc only emits .js; the server reads the .graphql files at runtime, so copy them into dist.
import { cpSync } from 'node:fs';

cpSync('src', 'dist', {
  recursive: true,
  filter: (path) => !path.includes('.') || path.endsWith('.graphql'),
});
