import { describe, expect, it } from 'vitest';
import { adaptFibonacciPivotSet, resolvePivotAnchorPeriod } from './fibonacci-pivot.js';

describe('adaptFibonacciPivotSet', () => {
  it('wraps indicator fixture levels for 5m → 1d mapping', () => {
    const result = adaptFibonacciPivotSet({
      chartTimeframe: '5m',
      sourceOHLC: { high: '110', low: '100', close: '105' },
      anchorStart: Date.parse('2026-11-13T07:00:00.000Z'),
      anchorEnd: Date.parse('2026-11-14T07:00:00.000Z'),
      calculationTimestamp: Date.parse('2026-11-14T07:00:00.000Z'),
      isComplete: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.pivotSet.method).toBe('FIBONACCI_PIVOT_POINTS');
    expect(result.pivotSet.version).toBe('1.0.0');
    expect(result.pivotSet.anchorPeriod).toBe('1d');
    expect(result.pivotSet.levels.find((level) => level.id === 'P')?.price).toBe('105');
    expect(result.pivotSet.levels.find((level) => level.id === 'R1')?.price).toBe('108.82');
    expect(result.pivotSet.levels.find((level) => level.id === 'S3')?.price).toBe('95');
  });

  it('rejects unsupported chart timeframes', () => {
    const result = adaptFibonacciPivotSet({
      chartTimeframe: '15m',
      sourceOHLC: { high: '110', low: '100', close: '105' },
      anchorStart: 0,
      anchorEnd: 1,
      calculationTimestamp: 1,
      isComplete: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCodes).toContain('PIVOT_MAPPING_UNSUPPORTED');
    }
  });
});

describe('resolvePivotAnchorPeriod', () => {
  it('maps 1h to 1w', () => {
    expect(resolvePivotAnchorPeriod('1h')).toBe('1w');
  });
});
