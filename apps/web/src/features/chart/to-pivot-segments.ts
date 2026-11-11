import { type SessionCandleRow, sessionIndexRange } from './session-scale.js';
import type { FibonacciPivotApiResponse, PivotLevelName, PivotSegment } from './types.js';

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
): PivotSegment[] {
  const segments: PivotSegment[] = [];
  for (const period of response.periods) {
    const startMs = Date.parse(period.validPeriod.start);
    const endMs = Date.parse(period.validPeriod.end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      continue;
    }
    const range = sessionIndexRange(candles, startMs, endMs);
    if (range === null) {
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
        x1: range.x1,
        x2: range.x2,
        y1: y,
        y2: y,
      });
    }
  }
  return segments;
}

export function pivotLabelRows(segments: readonly PivotSegment[]): PivotSegment[] {
  if (segments.length === 0) {
    return [];
  }
  const latestEnd = Math.max(...segments.map((segment) => segment.x2));
  return segments.filter((segment) => segment.x2 === latestEnd);
}
