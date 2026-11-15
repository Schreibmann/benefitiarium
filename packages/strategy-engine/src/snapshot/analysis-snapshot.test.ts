import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { adaptFibonacciPivotSet } from '../adapters/fibonacci-pivot.js';
import type { EngineCandle } from '../types.js';
import { buildAnalysisSnapshot } from './analysis-snapshot.js';

const instrumentId = parseInstrumentId('ffffffff-ffff-4fff-8fff-ffffffffffff');

function candle(index: number, high: string, low: string, close: string): EngineCandle {
  const start = Date.parse('2026-11-14T10:00:00.000Z') + index * 300_000;
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: start,
    closeTimestamp: start + 300_000,
    open: parseDecimalString(close),
    high: parseDecimalString(high),
    low: parseDecimalString(low),
    close: parseDecimalString(close),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: `snap-${index}`,
  };
}

describe('buildAnalysisSnapshot', () => {
  it('builds a deterministic snapshot from closed fixtures', () => {
    const candles = Array.from({ length: 20 }, (_, index) =>
      candle(index, String(101 + (index % 3)), String(99 - (index % 2)), String(100 + (index % 2))),
    );
    const decisionTimestamp = candles[19]?.closeTimestamp ?? 0;
    const pivot = adaptFibonacciPivotSet({
      chartTimeframe: '5m',
      sourceOHLC: { high: '110', low: '100', close: '105' },
      anchorStart: 0,
      anchorEnd: 1,
      calculationTimestamp: decisionTimestamp,
      isComplete: true,
    });
    expect(pivot.ok).toBe(true);
    if (!pivot.ok) {
      return;
    }

    const first = buildAnalysisSnapshot({
      decisionTimestamp,
      setupCandles: candles,
      tickSize: '0.01',
      pivotSet: pivot.pivotSet,
    });
    const second = buildAnalysisSnapshot({
      decisionTimestamp,
      setupCandles: candles,
      tickSize: '0.01',
      pivotSet: pivot.pivotSet,
    });

    expect(first.referenceCandle?.timestamp).toBe(candles[19]?.timestamp);
    expect(first.atr).not.toBeNull();
    expect(first.candleFeatures).not.toBeNull();
    expect(first.fibonacci.dataAvailable).toBe(true);
    expect(first.marketStructure.method).toBe('CONFIRMED_PIVOT_LR');
    expect(first).toEqual(second);
  });

  it('ignores open candles after the decision timestamp', () => {
    const closed = candle(0, '101', '99', '100');
    const later = {
      ...candle(1, '102', '98', '101'),
      status: 'OPEN' as const,
      revision: 2,
      sourceEventId: 'open-later',
    };
    const snapshot = buildAnalysisSnapshot({
      decisionTimestamp: closed.closeTimestamp,
      setupCandles: [closed, later],
      tickSize: '0.01',
    });
    expect(snapshot.referenceCandle?.sourceEventId).toBe('snap-0');
  });
});
