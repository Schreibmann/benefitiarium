import type { SessionCandleRow } from './session-scale.js';
import type { ChartTimeframe } from './types.js';

export function intervalMs(timeframe: ChartTimeframe): number {
  if (timeframe === '1m') {
    return 60_000;
  }
  if (timeframe === '5m') {
    return 300_000;
  }
  return 3_600_000;
}

/** Local noon of the calendar day after `from`. */
export function midOfNextLocalDay(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 12, 0, 0, 0);
}

/** Pivot line wall-clock length: 1 day for 1m/5m, 7 days for 1h. */
export function pivotLineDurationMs(timeframe: ChartTimeframe): number {
  if (timeframe === '1h') {
    return 7 * 24 * 60 * 60 * 1000;
  }
  return 24 * 60 * 60 * 1000;
}

/**
 * Map a wall-clock instant onto the packed session index axis.
 * Extrapolates past the last candle using the chart interval.
 */
export function sessionIndexAtTime(
  candles: readonly SessionCandleRow[],
  timeMs: number,
  timeframe: ChartTimeframe,
): number | null {
  if (candles.length === 0) {
    return null;
  }
  const first = candles[0];
  const last = candles[candles.length - 1];
  if (first === undefined || last === undefined) {
    return null;
  }
  if (timeMs <= first.Date.getTime()) {
    return first.index;
  }
  if (timeMs <= last.Date.getTime()) {
    let best = first;
    for (const candle of candles) {
      if (candle.Date.getTime() <= timeMs) {
        best = candle;
      } else {
        break;
      }
    }
    return best.index;
  }
  const deltaMs = timeMs - last.Date.getTime();
  return last.index + deltaMs / intervalMs(timeframe);
}

/** Empty future bars from the last candle through local noon of the next day. */
export function futurePadBars(
  candles: readonly SessionCandleRow[],
  timeframe: ChartTimeframe,
): number {
  const last = candles[candles.length - 1];
  if (last === undefined) {
    return 0;
  }
  const target = midOfNextLocalDay(last.Date);
  const deltaMs = target.getTime() - last.Date.getTime();
  if (deltaMs <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(deltaMs / intervalMs(timeframe)));
}

export function dateAtSessionIndex(
  candles: readonly SessionCandleRow[],
  index: number,
  timeframe: ChartTimeframe,
): Date | null {
  const rounded = Math.round(index);
  const exact = candles.find((row) => row.index === rounded);
  if (exact !== undefined) {
    return exact.Date;
  }
  const last = candles[candles.length - 1];
  const first = candles[0];
  if (last !== undefined && index > last.index) {
    return new Date(last.Date.getTime() + (index - last.index) * intervalMs(timeframe));
  }
  if (first !== undefined && index < first.index) {
    return new Date(first.Date.getTime() + (index - first.index) * intervalMs(timeframe));
  }
  return null;
}
