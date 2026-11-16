import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle } from '../types.js';
import { analyzeMarketStructure } from './market-structure.js';

const instrumentId = parseInstrumentId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

function candle(index: number, high: string, low: string, close: string): EngineCandle {
  const start = Date.parse('2026-11-14T10:00:00.000Z') + index * 60_000;
  return {
    instrumentId,
    timeframe: '1m',
    timestamp: start,
    closeTimestamp: start + 60_000,
    open: parseDecimalString(close),
    high: parseDecimalString(high),
    low: parseDecimalString(low),
    close: parseDecimalString(close),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `ms-${index}`,
  };
}

describe('analyzeMarketStructure', () => {
  it('detects confirmed swing highs/lows with left/right bars', () => {
    // Indices: 0..8. Swing high at 3 (high=120), swing low at 6 (low=80)
    const candles = [
      candle(0, '101', '99', '100'),
      candle(1, '102', '98', '100'),
      candle(2, '103', '97', '100'),
      candle(3, '120', '100', '110'),
      candle(4, '112', '100', '105'),
      candle(5, '111', '99', '104'),
      candle(6, '105', '80', '90'),
      candle(7, '100', '85', '92'),
      candle(8, '101', '86', '93'),
    ];

    const snapshot = analyzeMarketStructure(candles, '1', {
      atr: parseDecimalString('2'),
      config: { leftBars: 2, rightBars: 2, minProminenceTicks: 1, atrMultiple: 0.1 },
    });

    const highs = snapshot.swings.filter((swing) => swing.kind === 'HIGH');
    const lows = snapshot.swings.filter((swing) => swing.kind === 'LOW');
    expect(highs.some((swing) => swing.price === '120')).toBe(true);
    expect(lows.some((swing) => swing.price === '80')).toBe(true);
    expect(snapshot.method).toBe('CONFIRMED_PIVOT_LR');
  });

  it('returns UNKNOWN for insufficient history', () => {
    const snapshot = analyzeMarketStructure([candle(0, '101', '99', '100')], '1', {
      atr: parseDecimalString('1'),
    });
    expect(snapshot.regime).toBe('UNKNOWN');
    expect(snapshot.reasonCodes).toContain('REGIME_UNKNOWN');
  });
});
