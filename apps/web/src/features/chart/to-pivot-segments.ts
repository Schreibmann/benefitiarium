import { pivotLineDurationMs, sessionIndexAtTime } from './chart-time.js';
import type { SessionCandleRow } from './session-scale.js';
import type {
  ChartTimeframe,
  FibonacciPivotApiResponse,
  PivotLevelName,
  PivotSegment,
} from './types.js';

const LEVELS: Array<{
  level: PivotLevelName;
  key: keyof FibonacciPivotApiResponse['periods'][number]['values'];
}> = [
  { level: 'P', key: 'p' },
  { level: 'R1', key: 'r1' },
  { level: 'R2', key: 'r2' },
  { level: 'R3', key: 'r3' },
  { level: 'S1', key: 's1' },
  { level: 'S2', key: 's2' },
  { level: 'S3', key: 's3' },
];

export function toPivotSegments(
  response: FibonacciPivotApiResponse,
  candles: readonly SessionCandleRow[],
  timeframe: ChartTimeframe = response.chartTimeframe,
): PivotSegment[] {
  const durationMs = pivotLineDurationMs(timeframe);
  const segments: PivotSegment[] = [];
  for (const period of response.periods) {
    const startMs = Date.parse(period.validPeriod.start);
    if (!Number.isFinite(startMs)) {
      continue;
    }
    const endMs = startMs + durationMs;
    const x1 = sessionIndexAtTime(candles, startMs, timeframe);
    const x2 = sessionIndexAtTime(candles, endMs, timeframe);
    if (x1 === null || x2 === null) {
      continue;
    }
    for (const { level, key } of LEVELS) {
      const raw = period.values[key];
      const y = Number(raw);
      if (!Number.isFinite(y)) {
        continue;
      }
      segments.push({
        id: `${response.instrumentUid}:${response.chartTimeframe}:${period.validPeriod.id}:${level}:${period.algorithm.version}`,
        periodId: period.validPeriod.id,
        level,
        x1,
        x2: Math.max(x2, x1),
        y1: y,
        y2: y,
      });
    }
  }
  return segments;
}

/** Latest period's levels — used for right-axis price labels. */
export function pivotLabelRows(segments: readonly PivotSegment[]): PivotSegment[] {
  if (segments.length === 0) {
    return [];
  }
  const latestEnd = Math.max(...segments.map((segment) => segment.x2));
  return segments.filter((segment) => segment.x2 === latestEnd);
}
