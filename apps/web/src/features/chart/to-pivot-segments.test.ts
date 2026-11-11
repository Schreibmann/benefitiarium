import { describe, expect, it } from 'vitest';
import { toSessionCandles } from './session-scale.js';
import { pivotLabelRows, toPivotSegments } from './to-pivot-segments.js';
import type { CandleRow, FibonacciPivotApiResponse } from './types.js';

describe('toPivotSegments', () => {
  it('projects seven level segments onto session indices for a valid period', () => {
    const candles: CandleRow[] = [
      {
        Date: new Date('2026-11-04T08:00:00.000Z'),
        Open: 100,
        High: 101,
        Low: 99,
        Close: 100.5,
        Volume: 1,
        isClosed: true,
      },
      {
        Date: new Date('2026-11-04T09:00:00.000Z'),
        Open: 100.5,
        High: 102,
        Low: 100,
        Close: 101,
        Volume: 1,
        isClosed: true,
      },
      {
        Date: new Date('2026-11-05T08:00:00.000Z'),
        Open: 101,
        High: 103,
        Low: 100,
        Close: 102,
        Volume: 1,
        isClosed: true,
      },
    ];
    const response: FibonacciPivotApiResponse = {
      instrumentUid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      chartTimeframe: '5m',
      referenceTimeframe: '1D',
      periods: [
        {
          sourcePeriod: {
            id: 'src',
            timeframe: '1D',
            start: '2026-11-03T07:00:00.000Z',
            end: '2026-11-04T07:00:00.000Z',
          },
          validPeriod: {
            id: 'valid',
            start: '2026-11-04T07:00:00.000Z',
            end: '2026-11-05T07:00:00.000Z',
          },
          values: {
            p: '105',
            r1: '108.82',
            r2: '111.18',
            r3: '115',
            s1: '101.18',
            s2: '98.82',
            s3: '95',
          },
          algorithm: { id: 'FIBONACCI_PIVOT_POINTS', version: '1.0.0' },
        },
      ],
      meta: {
        requestedFrom: '2026-11-04T00:00:00.000Z',
        requestedTo: '2026-11-05T00:00:00.000Z',
        hasGaps: false,
      },
    };

    const session = toSessionCandles(candles);
    const segments = toPivotSegments(response, session, '5m');
    expect(segments).toHaveLength(7);
    expect(segments.map((row) => row.level)).toEqual(['P', 'R1', 'R2', 'R3', 'S1', 'S2', 'S3']);
    expect(segments[0]?.x1).toBe(0);
    // 1-day span from validPeriod.start lands on the last in-range session bar.
    expect(segments[0]?.x2).toBeGreaterThanOrEqual(1);
    expect(pivotLabelRows(segments)).toHaveLength(7);
  });
});
