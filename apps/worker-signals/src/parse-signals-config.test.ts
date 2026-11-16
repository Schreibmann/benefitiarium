import { loadEnv } from '@moex/config';
import { describe, expect, it } from 'vitest';
import { parseSignalsWorkerConfig } from './parse-signals-config.js';

function env(overrides: Record<string, string> = {}) {
  return loadEnv({
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
    ...overrides,
  });
}

describe('parseSignalsWorkerConfig', () => {
  it('parses defaults for close mode and 5m/1h', () => {
    const config = parseSignalsWorkerConfig(env());
    expect(config.timeframes).toEqual(['5m', '1h']);
    expect(config.evalMode).toBe('close');
    expect(config.waitingClose).toBe(true);
    expect(config.triggers).toEqual(['fib_pivot_approach', 'fib_pivot_cross']);
  });

  it('sets waitingClose false for intrabar mode', () => {
    const config = parseSignalsWorkerConfig(env({ SIGNALS_EVAL_MODE: 'intrabar' }));
    expect(config.evalMode).toBe('intrabar');
    expect(config.waitingClose).toBe(false);
  });

  it('rejects unknown timeframe', () => {
    expect(() => parseSignalsWorkerConfig(env({ SIGNALS_TIMEFRAMES: '15m' }))).toThrow(
      /Unsupported SIGNALS_TIMEFRAMES/,
    );
  });
});
