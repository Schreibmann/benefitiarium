import { describe, expect, it } from 'vitest';
import { calculateFibonacciPivotPoints } from './calculate.js';
import { generateHistoricalPivots } from './generate.js';
import type { ReferencePeriodOHLC, TradingPeriod } from './types.js';

describe('calculateFibonacciPivotPoints', () => {
  it('computes classic fibonacci pivot levels', () => {
    const result = calculateFibonacciPivotPoints({
      high: '110',
      low: '100',
      close: '105',
    });
    expect(result.quality).toBe('ok');
    expect(result.values.p).toBe('105');
    expect(result.values.r1).toBe('108.82');
    expect(result.values.r2).toBe('111.18');
    expect(result.values.r3).toBe('115');
    expect(result.values.s1).toBe('101.18');
    expect(result.values.s2).toBe('98.82');
    expect(result.values.s3).toBe('95');
  });

  it('marks degenerate zero-range OHLC', () => {
    const result = calculateFibonacciPivotPoints({
      high: '42',
      low: '42',
      close: '42',
    });
    expect(result.quality).toBe('DEGENERATE_RANGE');
    expect(result.values.p).toBe('42');
    expect(result.values.r3).toBe('42');
    expect(result.values.s3).toBe('42');
  });

  it('rejects invalid OHLC', () => {
    expect(() => calculateFibonacciPivotPoints({ high: '100', low: '110', close: '105' })).toThrow(
      /high < low/,
    );
    expect(() => calculateFibonacciPivotPoints({ high: '110', low: '100', close: '99' })).toThrow(
      /close outside/,
    );
  });
});

describe('generateHistoricalPivots', () => {
  const dayA: ReferencePeriodOHLC = {
    instrumentUid: 'inst',
    timeframe: '1d',
    periodId: 'D-1',
    start: new Date('2026-11-03T07:00:00.000Z'),
    end: new Date('2026-11-04T07:00:00.000Z'),
    high: '110',
    low: '100',
    close: '105',
    isComplete: true,
    source: {
      provider: 't-invest',
      candleSource: 'EXCHANGE',
      interval: '1d',
      aggregationMethod: 'NATIVE',
      sourceHash: 'hash-d1',
    },
  };

  const dayB: ReferencePeriodOHLC = {
    ...dayA,
    periodId: 'D-2',
    start: new Date('2026-11-04T07:00:00.000Z'),
    end: new Date('2026-11-05T07:00:00.000Z'),
    high: '120',
    low: '110',
    close: '115',
    source: { ...dayA.source, sourceHash: 'hash-d2' },
  };

  const targets: TradingPeriod[] = [
    {
      periodId: 'T-2',
      start: new Date('2026-11-04T07:00:00.000Z'),
      end: new Date('2026-11-05T07:00:00.000Z'),
    },
    {
      periodId: 'T-3',
      start: new Date('2026-11-05T07:00:00.000Z'),
      end: new Date('2026-11-06T07:00:00.000Z'),
    },
  ];

  it('uses previous source period only (anti-look-ahead)', () => {
    const result = generateHistoricalPivots({
      instrumentUid: 'inst',
      chartTimeframe: '5m',
      sourcePeriods: [dayA, dayB],
      targetPeriods: targets,
      now: () => new Date('2026-11-09T00:00:00.000Z'),
    });

    expect(result.missingPeriodIds).toEqual([]);
    expect(result.periods).toHaveLength(2);

    const first = result.periods[0];
    expect(first?.sourcePeriodId).toBe('D-1');
    expect(first?.validPeriodId).toBe('T-2');
    expect(first?.levels.p).toBe('105');
    expect(first?.sourcePeriodId).not.toBe(first?.validPeriodId);

    const second = result.periods[1];
    expect(second?.sourcePeriodId).toBe('D-2');
    expect(second?.validPeriodId).toBe('T-3');
    expect(second?.levels.p).toBe('115');
  });

  it('records gaps when prior source is missing', () => {
    const result = generateHistoricalPivots({
      instrumentUid: 'inst',
      chartTimeframe: '5m',
      sourcePeriods: [dayB],
      targetPeriods: [
        {
          periodId: 'T-early',
          start: new Date('2026-11-03T07:00:00.000Z'),
          end: new Date('2026-11-04T07:00:00.000Z'),
        },
      ],
    });
    expect(result.periods).toHaveLength(0);
    expect(result.missingPeriodIds).toEqual(['T-early']);
  });
});
