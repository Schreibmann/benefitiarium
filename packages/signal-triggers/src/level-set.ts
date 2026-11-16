import type { CalculatedPivotPeriod, FibonacciPivotLevelName } from '@moex/indicators';
import type { Level, LevelSet } from './types.js';

const LEVEL_ORDER: readonly FibonacciPivotLevelName[] = ['P', 'R1', 'R2', 'R3', 'S1', 'S2', 'S3'];

export function levelsFromPivotPeriod(period: CalculatedPivotPeriod): LevelSet {
  const values = period.levels;
  const byName: Record<FibonacciPivotLevelName, string> = {
    P: values.p,
    R1: values.r1,
    R2: values.r2,
    R3: values.r3,
    S1: values.s1,
    S2: values.s2,
    S3: values.s3,
  };
  const levels: Level[] = LEVEL_ORDER.map((name) => ({
    name,
    value: byName[name],
  }));

  return {
    source: 'fibonacci_pivot',
    periodId: period.validPeriodId,
    quality: period.quality,
    levels,
  };
}
