import type { CandleRow } from './types.js';

export type SessionCandleRow = CandleRow & {
  index: number;
};

/** Pack trading bars onto a contiguous index axis (skip calendar gaps). */
export function toSessionCandles(candles: readonly CandleRow[]): SessionCandleRow[] {
  return [...candles]
    .sort((left, right) => left.Date.getTime() - right.Date.getTime())
    .map((candle, index) => ({ ...candle, index }));
}

export function candlePriceDomain(candles: readonly CandleRow[]): {
  min: number;
  max: number;
} | null {
  if (candles.length === 0) {
    return null;
  }
  const first = candles[0];
  if (first === undefined) {
    return null;
  }
  let min = first.Low;
  let max = first.High;
  for (const candle of candles) {
    if (candle.Low < min) {
      min = candle.Low;
    }
    if (candle.High > max) {
      max = candle.High;
    }
  }
  const span = max - min;
  const pad = span > 0 ? span * 0.06 : Math.max(Math.abs(max) * 0.001, 1e-6);
  return { min: min - pad, max: max + pad };
}

/**
 * Map a time window onto session indices.
 * Prefers half-open [start, end); falls back to closed range for open periods.
 */
export function sessionIndexRange(
  candles: readonly SessionCandleRow[],
  startMs: number,
  endMs: number,
): { x1: number; x2: number } | null {
  if (candles.length === 0) {
    return null;
  }

  let first: number | null = null;
  let last: number | null = null;
  for (const candle of candles) {
    const t = candle.Date.getTime();
    if (t >= startMs && t < endMs) {
      if (first === null) {
        first = candle.index;
      }
      last = candle.index;
    }
  }

  if (first === null || last === null) {
    for (const candle of candles) {
      const t = candle.Date.getTime();
      if (t >= startMs && t <= endMs) {
        if (first === null) {
          first = candle.index;
        }
        last = candle.index;
      }
    }
  }

  if (first === null || last === null) {
    return null;
  }
  return { x1: first, x2: Math.max(last, first) };
}
