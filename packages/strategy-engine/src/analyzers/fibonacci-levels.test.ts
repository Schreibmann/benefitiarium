import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { adaptFibonacciPivotSet } from '../adapters/fibonacci-pivot.js';
import type { EngineCandle } from '../types.js';
import { analyzeFibonacciLevels } from './fibonacci-levels.js';

const instrumentId = parseInstrumentId('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

function closedCandle(): EngineCandle {
  const start = Date.parse('2026-11-14T10:00:00.000Z');
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: start,
    closeTimestamp: start + 300_000,
    open: parseDecimalString('104'),
    high: parseDecimalString('106'),
    low: parseDecimalString('103'),
    close: parseDecimalString('105'),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: 'fib-ref',
  };
}

describe('analyzeFibonacciLevels', () => {
  it('builds zones and nearest levels from pivot adapter output', () => {
    const pivot = adaptFibonacciPivotSet({
      chartTimeframe: '5m',
      sourceOHLC: { high: '110', low: '100', close: '105' },
      anchorStart: 0,
      anchorEnd: 1,
      calculationTimestamp: 1,
      isComplete: true,
    });
    expect(pivot.ok).toBe(true);
    if (!pivot.ok) {
      return;
    }

    const analysis = analyzeFibonacciLevels(
      pivot.pivotSet,
      closedCandle(),
      parseDecimalString('5'),
      parseDecimalString('0.01'),
    );

    expect(analysis.dataAvailable).toBe(true);
    expect(analysis.levels.length).toBe(7);
    expect(analysis.nearestAbove?.sourceId === 'R1' || analysis.nearestAbove !== null).toBe(true);
    expect(analysis.levels.every((level) => level.source === 'FIB_PIVOT')).toBe(true);
  });

  it('marks unavailable when pivot set is missing', () => {
    const analysis = analyzeFibonacciLevels(null, closedCandle(), '1', '0.01');
    expect(analysis.dataAvailable).toBe(false);
    expect(analysis.warnings).toContain('PIVOT_SET_UNAVAILABLE');
  });
});
