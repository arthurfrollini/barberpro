import { defineConfig, devices } from '@playwright/test';
import { API, API_PORT, WEB_PORT } from './e2e/support/env';

// The real stack: the API and the dashboard start here, against the test database and the
// Redis and Mailpit from Docker Compose (service containers in CI).
const API_URL = API.url;

const apiEnv = {
  NODE_ENV: 'test',
  PORT: String(API_PORT),
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? 'postgres://barberpro:barberpro@localhost:5442/barberpro_test',
  REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:6390',
  SMTP_URL: process.env.E2E_SMTP_URL ?? 'smtp://localhost:1025',
  JWT_SECRET: 'web-e2e-secret-web-e2e-secret-web-e2e-secret',
  PUBLIC_URL: API_URL,
  QUEUE_PREFIX: 'barberpro-web-e2e',
  UPLOAD_DIR: 'uploads/web-e2e',
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'api',
      cwd: '..',
      command: 'npm run migration:run && npx tsx src/main.ts',
      url: `${API_URL}/health`,
      env: apiEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: 'web',
      command: `npx vite --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_URL, PORT: String(WEB_PORT) },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
