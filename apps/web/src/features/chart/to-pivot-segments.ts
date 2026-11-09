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

export function toPivotSegments(response: FibonacciPivotApiResponse): PivotSegment[] {
  const segments: PivotSegment[] = [];
  for (const period of response.periods) {
    const x1 = new Date(period.validPeriod.start);
    const x2 = new Date(period.validPeriod.end);
    if (Number.isNaN(x1.getTime()) || Number.isNaN(x2.getTime())) {
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
        x2,
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
  const latestEnd = Math.max(...segments.map((segment) => segment.x2.getTime()));
  return segments.filter((segment) => segment.x2.getTime() === latestEnd);
}
