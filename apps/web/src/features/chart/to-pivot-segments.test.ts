import { describe, expect, it } from 'vitest';
import { pivotLabelRows, toPivotSegments } from './to-pivot-segments.js';
import type { FibonacciPivotApiResponse } from './types.js';

describe('toPivotSegments', () => {
  it('expands seven level segments per valid period', () => {
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

    const segments = toPivotSegments(response);
    expect(segments).toHaveLength(7);
    expect(segments.map((row) => row.level)).toEqual(['P', 'R1', 'R2', 'R3', 'S1', 'S2', 'S3']);
    expect(pivotLabelRows(segments)).toHaveLength(7);
  });
});
