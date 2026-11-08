import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
};

describe('loadEnv', () => {
  it('loads defaults for non-secret values', () => {
    const env = loadEnv(baseEnv);
    expect(env.TRADING_MODE).toBe('research');
    expect(env.LIVE_TRADING_ENABLED).toBe(false);
    expect(env.GLOBAL_KILL_SWITCH).toBe(true);
    expect(env.TINVEST_ENV).toBe('sandbox');
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('parses boolean flags from strings', () => {
    const env = loadEnv({
      ...baseEnv,
      LIVE_TRADING_ENABLED: 'true',
      GLOBAL_KILL_SWITCH: 'false',
    });
    expect(env.LIVE_TRADING_ENABLED).toBe(true);
    expect(env.GLOBAL_KILL_SWITCH).toBe(false);
  });
});
