import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle } from '../types.js';
import {
  computeCandleFeatures,
  computeFallbackRvol,
  rvolToEvidenceScore,
} from './candle-features.js';

const instrumentId = parseInstrumentId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

function candle(
  index: number,
  volume: string,
  ohlc?: {
    open: string;
    high: string;
    low: string;
    close: string;
  },
): EngineCandle {
  const start = Date.parse('2026-11-14T10:00:00.000Z') + index * 300_000;
  const open = ohlc?.open ?? '100';
  const high = ohlc?.high ?? '110';
  const low = ohlc?.low ?? '90';
  const close = ohlc?.close ?? '105';
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: start,
    closeTimestamp: start + 300_000,
    open: parseDecimalString(open),
    high: parseDecimalString(high),
    low: parseDecimalString(low),
    close: parseDecimalString(close),
    volume: parseDecimalString(volume),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `v-${index}`,
  };
}

describe('computeCandleFeatures', () => {
  it('computes body, wicks, and close location', () => {
    const features = computeCandleFeatures(
      candle(0, '10', { open: '100', high: '110', low: '90', close: '105' }),
    );
    expect(features.body).toBe('5');
    expect(features.range).toBe('20');
    expect(features.bodyRatio).toBe(0.25);
    expect(features.upperWick).toBe('5');
    expect(features.lowerWick).toBe('10');
    expect(features.closeLocation).toBe(0.75);
    expect(features.isBullish).toBe(true);
    expect(features.isFlat).toBe(false);
  });

  it('handles flat candles without division by zero', () => {
    const features = computeCandleFeatures(
      candle(0, '1', { open: '100', high: '100', low: '100', close: '100' }),
    );
    expect(features.bodyRatio).toBe(0);
    expect(features.closeLocation).toBe(0.5);
    expect(features.isFlat).toBe(true);
  });
});

describe('computeFallbackRvol', () => {
  it('returns null until lookback is filled', () => {
    const history = [candle(0, '10'), candle(1, '20')];
    expect(computeFallbackRvol(candle(2, '30'), history, 3)).toBeNull();
  });

  it('uses median of prior volumes only', () => {
    const history = Array.from({ length: 20 }, (_, index) => candle(index, '10'));
    const current = candle(20, '20');
    expect(computeFallbackRvol(current, history, 20)).toBe(2);
  });
});

describe('rvolToEvidenceScore', () => {
  it('maps buckets from the Benefit starting table', () => {
    expect(rvolToEvidenceScore(0.5)).toBe(0);
    expect(rvolToEvidenceScore(0.8)).toBe(0.2);
    expect(rvolToEvidenceScore(1.1)).toBe(0.4);
    expect(rvolToEvidenceScore(1.3)).toBe(0.67);
    expect(rvolToEvidenceScore(2)).toBe(1);
    expect(rvolToEvidenceScore(null)).toBeNull();
  });
});
