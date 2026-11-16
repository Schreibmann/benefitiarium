import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle } from '../types.js';
import { buildMtfContextSnapshot, candlesAsOf, scoreMtfAlignment } from './as-of.js';

const instrumentId = parseInstrumentId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');

function candle(
  timeframe: EngineCandle['timeframe'],
  index: number,
  closeAtOffsetMs: number,
): EngineCandle {
  const start = Date.parse('2026-11-14T00:00:00.000Z') + index * closeAtOffsetMs;
  return {
    instrumentId,
    timeframe,
    timestamp: start,
    closeTimestamp: start + closeAtOffsetMs,
    open: parseDecimalString('100'),
    high: parseDecimalString('101'),
    low: parseDecimalString('99'),
    close: parseDecimalString('100.5'),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `${timeframe}-${index}`,
  };
}

describe('candlesAsOf', () => {
  it('excludes candles that close after the decision timestamp', () => {
    const candles = [candle('1h', 0, 3_600_000), candle('1h', 1, 3_600_000)];
    const decision = candles[0]?.closeTimestamp ?? 0;
    const asOf = candlesAsOf(candles, decision);
    expect(asOf).toHaveLength(1);
    expect(asOf[0]?.timestamp).toBe(candles[0]?.timestamp);
  });
});

describe('buildMtfContextSnapshot / scoreMtfAlignment', () => {
  it('reports MTF_UNAVAILABLE when a role has no as-of candles', () => {
    const mtf = buildMtfContextSnapshot({
      decisionTimestamp: Date.parse('2026-11-14T12:00:00.000Z'),
      roleConfig: {
        contextTimeframe: '1d',
        setupTimeframe: '1h',
        entryTimeframe: '5m',
      },
      candlesByTimeframe: {
        '1h': [candle('1h', 0, 3_600_000)],
        '5m': [candle('5m', 0, 300_000)],
      },
    });

    expect(mtf.unavailableRoles).toContain('CONTEXT_TF');
    const alignment = scoreMtfAlignment({
      direction: 'LONG',
      mtf,
      tickSize: '0.01',
    });
    expect(alignment.reasonCodes).toContain('MTF_UNAVAILABLE');
    expect(alignment.score).toBe(0);
  });
});
