import { z } from 'zod';

const booleanFromString = z.union([z.boolean(), z.string()]).transform((value, ctx) => {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  ctx.addIssue({
    code: 'custom',
    message: `Expected boolean string, received "${value}"`,
  });
  return z.NEVER;
});

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_TIMEZONE: z.string().min(1).default('Europe/Moscow'),
  DATABASE_URL: z.string().min(1),
  TINVEST_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  TINVEST_BASE_URL: z.string().url().default('https://sandbox-invest-public-api.tbank.ru:443'),
  TINVEST_TOKEN: z.string().default(''),
  TINVEST_ACCOUNT_ID: z.string().default(''),
  MOEX_ISS_BASE_URL: z.string().url().default('https://iss.moex.com/iss'),
  MOEX_ISS_AUTH_MODE: z.enum(['anonymous', 'authenticated']).default('anonymous'),
  TRADING_MODE: z
    .enum(['research', 'manual', 'paper', 'sandbox', 'live_guarded', 'live'])
    .default('research'),
  LIVE_TRADING_ENABLED: booleanFromString.default(false),
  GLOBAL_KILL_SWITCH: booleanFromString.default(true),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvSource = Record<string, string | undefined>;

export function loadEnv(source: EnvSource = process.env): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
