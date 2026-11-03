import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The browser talks to one origin: Vite forwards the API's paths, so the API needs no CORS.
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
const proxy = Object.fromEntries(['/graphql', '/uploads', '/files'].map((p) => [p, apiUrl]));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: Number(process.env.PORT ?? 5180), strictPort: true, proxy },
  preview: { port: Number(process.env.PORT ?? 5180), strictPort: true, proxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // `npm run test:coverage`; codegen output and test helpers are not measured
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/gql/**', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
});
