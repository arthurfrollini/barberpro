import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SMTP_URL: z.url(),
  MAIL_FROM: z.string().default('BarberPro <no-reply@barberpro.dev>'),
  UPLOAD_DIR: z.string().default('uploads'),
  PUBLIC_URL: z.url().default('http://localhost:4000'),
  DASHBOARD_URL: z.url().default('http://localhost:5180'),
  QUEUE_PREFIX: z.string().min(1).default('barberpro'),
  EXPO_PUSH_URL: z.url().default('https://exp.host/--/api/v2/push'),
  // only when push security is turned on for the project in Expo's dashboard
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
});

export type Config = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  smtpUrl: string;
  mailFrom: string;
  uploadDir: string;
  publicUrl: string;
  /** Where the barber dashboard runs; invite emails link to it. */
  dashboardUrl: string;
  /** Namespace of the BullMQ keys in Redis; tests use their own. */
  queuePrefix: string;
  /** Expo's push API; tests point it at a local fake. */
  expoPushUrl: string;
  expoAccessToken: string | undefined;
};

/** Reads and validates the environment once, at startup, so a bad deploy fails fast. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment:\n${problems.join('\n')}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    jwtSecret: e.JWT_SECRET,
    accessTokenTtlSeconds: e.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
    smtpUrl: e.SMTP_URL,
    mailFrom: e.MAIL_FROM,
    uploadDir: e.UPLOAD_DIR,
    publicUrl: e.PUBLIC_URL,
    dashboardUrl: e.DASHBOARD_URL.replace(/\/$/, ''),
    queuePrefix: e.QUEUE_PREFIX,
    expoPushUrl: e.EXPO_PUSH_URL.replace(/\/$/, ''),
    expoAccessToken: e.EXPO_ACCESS_TOKEN,
  };
}
