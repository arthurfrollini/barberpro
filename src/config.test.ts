import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5442/barberpro',
  REDIS_URL: 'redis://localhost:6390',
  JWT_SECRET: 'a'.repeat(32),
  SMTP_URL: 'smtp://localhost:1025',
};

describe('loadConfig', () => {
  it('fills defaults for optional variables', () => {
    const config = loadConfig(valid);

    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('development');
    expect(config.accessTokenTtlSeconds).toBe(900);
    expect(config.refreshTokenTtlDays).toBe(30);
    expect(config.databaseUrl).toBe(valid.DATABASE_URL);
  });

  it('names every invalid variable in one error', () => {
    const { DATABASE_URL: _, ...withoutDb } = valid;

    expect(() => loadConfig({ ...withoutDb, JWT_SECRET: 'short' })).toThrow(
      /DATABASE_URL[\s\S]*JWT_SECRET|JWT_SECRET[\s\S]*DATABASE_URL/,
    );
  });
});
