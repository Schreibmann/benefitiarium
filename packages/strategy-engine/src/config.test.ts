import { describe, expect, it } from 'vitest';
import {
  parseTradingSignalEngineConfig,
  TRADING_SIGNAL_ENGINE_ALGORITHM_ID,
  TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION,
} from './config.js';

describe('parseTradingSignalEngineConfig', () => {
  it('parses a minimal valid config with defaults', () => {
    const config = parseTradingSignalEngineConfig({
      configVersion: 'cfg-1',
      analysisTimeframes: ['5m', '1h'],
    });

    expect(config.algorithmId).toBe(TRADING_SIGNAL_ENGINE_ALGORITHM_ID);
    expect(config.algorithmVersion).toBe(TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION);
    expect(config.enabledStrategies).toEqual(['TREND_PULLBACK', 'BREAKOUT_RETEST']);
    expect(config.confirmOnlyOnClosedCandles).toBe(true);
    expect(config.exchangeTimezone).toBe('Europe/Moscow');
  });

  it('rejects disabling closed-candle confirmation', () => {
    expect(() =>
      parseTradingSignalEngineConfig({
        configVersion: 'cfg-2',
        analysisTimeframes: ['5m'],
        confirmOnlyOnClosedCandles: false,
      }),
    ).toThrow(/confirmOnlyOnClosedCandles/);
  });
});
