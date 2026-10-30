import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../support/app.js';

describe('GET /health', () => {
  let t: TestApp;
  afterEach(() => t.close());

  it('is 200 when Postgres and Redis answer', async () => {
    t = await createTestApp();

    const res = await t.app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', checks: { postgres: 'up', redis: 'up' } });
  });

  it('is 503 and names the dependency that is down', async () => {
    t = await createTestApp((c) => {
      c.healthChecks.redis = async () => {
        throw new Error('connection refused');
      };
    });

    const res = await t.app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'error', checks: { postgres: 'up', redis: 'down' } });
  });
});
