import { intervalMs } from './chart-time.js';
import type { ChartTimeRange } from './chart-viewport.js';
import type { ChartTimeframe } from './types.js';

const MS_PER_UTC_DAY = 24 * 60 * 60 * 1000;

/** Inclusive UTC calendar days covered by a wall-clock range (YYYY-MM-DD). */
export function utcDayKeysFromTimeRange(range: ChartTimeRange): readonly string[] {
  const fromMs = Math.min(range.fromMs, range.toMs);
  const toMs = Math.max(range.fromMs, range.toMs);
  const startDay = Math.floor(fromMs / MS_PER_UTC_DAY);
  const endDay = Math.floor(toMs / MS_PER_UTC_DAY);
  const days: string[] = [];
  for (let day = startDay; day <= endDay; day += 1) {
    days.push(new Date(day * MS_PER_UTC_DAY).toISOString().slice(0, 10));
  }
  return days;
}

/** Stable skip key: instrument + TF + sorted unique UTC days. */
export function visibleVolumeFetchKey(input: {
  instrumentUid: string;
  timeframe: ChartTimeframe;
  range: ChartTimeRange;
}): string {
  const days = utcDayKeysFromTimeRange(input.range);
  return `${input.instrumentUid}|${input.timeframe}|${days.join(',')}`;
}

/**
 * API query bounds for visible VP. Candle `Date` is bar open; `to` is exclusive
 * and must be strictly greater than `from`, so extend through the last bar.
 */
export function chartTimeRangeToIso(
  range: ChartTimeRange,
  timeframe: ChartTimeframe,
): { from: string; to: string } {
  const fromMs = Math.min(range.fromMs, range.toMs);
  const lastOpenMs = Math.max(range.fromMs, range.toMs);
  const toMs = lastOpenMs + intervalMs(timeframe);
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
}
