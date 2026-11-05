import { defineConfig, devices } from '@playwright/test';
import { API, API_PORT, APP_PORT } from './e2e/support/env';

// The real stack: the API and the worker start here against the test database and the Redis
// and Mailpit from Docker Compose (service containers in CI); the app is its web build.
const apiEnv = {
  NODE_ENV: 'test',
  PORT: String(API_PORT),
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? 'postgres://barberpro:barberpro@localhost:5442/barberpro_test',
  REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:6390',
  SMTP_URL: process.env.E2E_SMTP_URL ?? 'smtp://localhost:1025',
  JWT_SECRET: 'mobile-e2e-secret-mobile-e2e-secret-mobile-e2e',
  PUBLIC_URL: API.url,
  QUEUE_PREFIX: 'barberpro-mobile-e2e',
  UPLOAD_DIR: 'uploads/mobile-e2e',
  DASHBOARD_URL: 'http://localhost:5181',
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    geolocation: { latitude: -23.5614, longitude: -46.6559 },
    permissions: ['geolocation'],
    trace: 'retain-on-failure',
  },
  // a phone-sized Chromium: the app is built for one
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      name: 'api',
      cwd: '..',
      command: 'npm run migration:run && npx tsx src/main.ts',
      url: `${API.url}/health`,
      env: apiEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: 'worker',
      cwd: '..',
      command: 'npx tsx src/worker.ts',
      wait: { stdout: /worker started/ },
      env: apiEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      name: 'app',
      command: 'npm run export:web && node e2e/support/serve.mjs',
      url: `http://localhost:${APP_PORT}`,
      env: { EXPO_PUBLIC_API_URL: API.url, PORT: String(APP_PORT), CI: '1' },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
