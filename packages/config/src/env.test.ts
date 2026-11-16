import { describe, expect, it } from 'vitest';
import {
  loadEnv,
  requireTinvestToken,
  resolveTinvestSandboxAccountId,
  resolveTinvestToken,
} from './env.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
};

describe('loadEnv', () => {
  it('loads defaults for non-secret values', () => {
    const env = loadEnv(baseEnv);
    expect(env.TRADING_MODE).toBe('research');
    expect(env.LIVE_TRADING_ENABLED).toBe(false);
    expect(env.LIVE_CANDLE_STREAM_LOG).toBe(false);
    expect(env.GLOBAL_KILL_SWITCH).toBe(true);
    expect(env.TINVEST_ENV).toBe('sandbox');
    expect(env.MOEX_ISS_AUTH_MODE).toBe('anonymous');
    expect(env.MOEX_ISS_TOKEN).toBe('');
    expect(env.TINVEST_SANDBOX_TOKEN).toBe('');
    expect(env.TINVEST_READ_ONLY_TOKEN).toBe('');
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('parses boolean flags from strings', () => {
    const env = loadEnv({
      ...baseEnv,
      LIVE_TRADING_ENABLED: 'true',
      LIVE_CANDLE_STREAM_LOG: 'true',
      GLOBAL_KILL_SWITCH: 'false',
    });
    expect(env.LIVE_TRADING_ENABLED).toBe(true);
    expect(env.LIVE_CANDLE_STREAM_LOG).toBe(true);
    expect(env.GLOBAL_KILL_SWITCH).toBe(false);
  });

  it('resolves sandbox and read-only tokens separately', () => {
    const env = loadEnv({
      ...baseEnv,
      TINVEST_SANDBOX_TOKEN: ' sandbox-secret ',
      TINVEST_READ_ONLY_TOKEN: ' readonly-secret ',
    });
    expect(resolveTinvestToken(env, 'sandbox')).toBe('sandbox-secret');
    expect(resolveTinvestToken(env, 'read_only')).toBe('readonly-secret');
    expect(requireTinvestToken(env, 'sandbox')).toBe('sandbox-secret');
  });

  it('requireTinvestToken fails with the correct env key name', () => {
    const env = loadEnv(baseEnv);
    expect(() => requireTinvestToken(env, 'sandbox')).toThrow(/TINVEST_SANDBOX_TOKEN/);
    expect(() => requireTinvestToken(env, 'read_only')).toThrow(/TINVEST_READ_ONLY_TOKEN/);
  });

  it('prefers TINVEST_SANDBOX_ACCOUNT_ID over legacy TINVEST_ACCOUNT_ID', () => {
    const env = loadEnv({
      ...baseEnv,
      TINVEST_SANDBOX_ACCOUNT_ID: 'sandbox-primary',
      TINVEST_ACCOUNT_ID: 'legacy',
    });
    expect(resolveTinvestSandboxAccountId(env)).toBe('sandbox-primary');
    expect(
      resolveTinvestSandboxAccountId(loadEnv({ ...baseEnv, TINVEST_ACCOUNT_ID: 'legacy' })),
    ).toBe('legacy');
  });
});
