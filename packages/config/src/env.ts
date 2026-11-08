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
  /**
   * Sandbox trading/write-capable token. Use only against sandbox URL / sandbox account flows.
   * Never ship to browser or strategy workers.
   */
  TINVEST_SANDBOX_TOKEN: z.string().default(''),
  /**
   * Production (or invest-api) read-only token for catalog/history/market-data reads.
   * Must not be used for order placement.
   */
  TINVEST_READ_ONLY_TOKEN: z.string().default(''),
  /**
   * Full-access production token. Reserved for worker-execution only (later milestones).
   * Must never be loaded into web, api read paths, or strategy workers.
   */
  TINVEST_FULL_ACCESS_TOKEN: z.string().default(''),
  /** Preferred sandbox account id for SandboxService calls. */
  TINVEST_SANDBOX_ACCOUNT_ID: z.string().default(''),
  /** @deprecated Prefer TINVEST_SANDBOX_ACCOUNT_ID. Kept temporarily for older local envs. */
  TINVEST_ACCOUNT_ID: z.string().default(''),
  MOEX_ISS_BASE_URL: z.string().url().default('https://iss.moex.com/iss'),
  MOEX_ISS_AUTH_MODE: z.enum(['anonymous', 'authenticated']).default('anonymous'),
  /** AlgoPack / authenticated ISS token; required only when MOEX_ISS_AUTH_MODE=authenticated. */
  MOEX_ISS_TOKEN: z.string().default(''),
  TRADING_MODE: z
    .enum(['research', 'manual', 'paper', 'sandbox', 'live_guarded', 'live'])
    .default('research'),
  LIVE_TRADING_ENABLED: booleanFromString.default(false),
  GLOBAL_KILL_SWITCH: booleanFromString.default(true),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvSource = Record<string, string | undefined>;

export type TinvestTokenPurpose = 'sandbox' | 'read_only';

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

/** Non-empty trimmed token or null. Never log the return value. */
export function resolveTinvestToken(env: AppEnv, purpose: TinvestTokenPurpose): string | null {
  const raw =
    purpose === 'sandbox' ? env.TINVEST_SANDBOX_TOKEN : env.TINVEST_READ_ONLY_TOKEN;
  const token = raw.trim();
  return token.length > 0 ? token : null;
}

export function requireTinvestToken(env: AppEnv, purpose: TinvestTokenPurpose): string {
  const token = resolveTinvestToken(env, purpose);
  if (token === null) {
    const key =
      purpose === 'sandbox' ? 'TINVEST_SANDBOX_TOKEN' : 'TINVEST_READ_ONLY_TOKEN';
    throw new Error(`${key} is required for this operation`);
  }
  return token;
}

/** Sandbox account id; prefers TINVEST_SANDBOX_ACCOUNT_ID over legacy TINVEST_ACCOUNT_ID. */
export function resolveTinvestSandboxAccountId(env: AppEnv): string | null {
  const primary = env.TINVEST_SANDBOX_ACCOUNT_ID.trim();
  if (primary.length > 0) {
    return primary;
  }
  const legacy = env.TINVEST_ACCOUNT_ID.trim();
  return legacy.length > 0 ? legacy : null;
}
