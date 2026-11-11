import { describe, expect, it } from 'vitest';
import { candlePriceDomain, sessionIndexRange, toSessionCandles } from './session-scale.js';
import type { CandleRow } from './types.js';

const sample: CandleRow[] = [
  {
    Date: new Date('2026-11-07T10:00:00.000Z'),
    Open: 1,
    High: 2,
    Low: 0.5,
    Close: 1.5,
    Volume: 1,
    isClosed: true,
  },
  {
    Date: new Date('2026-11-09T10:00:00.000Z'),
    Open: 3,
    High: 4,
    Low: 2.5,
    Close: 3.5,
    Volume: 1,
    isClosed: true,
  },
];

describe('session-scale', () => {
  it('packs candles onto contiguous indices despite calendar gaps', () => {
    const session = toSessionCandles(sample);
    expect(session.map((row) => row.index)).toEqual([0, 1]);
  });

  it('maps open period bars with closed end inclusive fallback', () => {
    const session = toSessionCandles(sample);
    const range = sessionIndexRange(
      session,
      Date.parse('2026-11-09T00:00:00.000Z'),
      Date.parse('2026-11-09T10:00:00.000Z'),
    );
    expect(range).toEqual({ x1: 1, x2: 1 });
  });

  it('derives y domain from candle highs/lows with padding', () => {
    const domain = candlePriceDomain(sample);
    expect(domain).not.toBeNull();
    if (domain === null) {
      return;
    }
    expect(domain.min).toBeLessThan(0.5);
    expect(domain.max).toBeGreaterThan(4);
  });
});
