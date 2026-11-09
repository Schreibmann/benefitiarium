import type { DecimalString } from '@moex/domain';

export const FIBONACCI_PIVOT_ALGORITHM_ID = 'FIBONACCI_PIVOT_POINTS' as const;
export const FIBONACCI_PIVOT_ALGORITHM_VERSION = '1.0.0' as const;

export const FIBONACCI_PIVOT_COEFFICIENTS = {
  first: '0.382',
  second: '0.618',
  third: '1.000',
} as const;

export const FIBONACCI_PIVOT_TIMEFRAME_MAP = {
  '5m': '1d',
  '1h': '1w',
} as const;

export type ChartTimeframe = keyof typeof FIBONACCI_PIVOT_TIMEFRAME_MAP;
export type ReferenceTimeframe = (typeof FIBONACCI_PIVOT_TIMEFRAME_MAP)[ChartTimeframe];

export type FibonacciPivotLevelName = 'P' | 'R1' | 'R2' | 'R3' | 'S1' | 'S2' | 'S3';

export type PivotSourceOHLC = {
  high: DecimalString | string;
  low: DecimalString | string;
  close: DecimalString | string;
};

export type FibonacciPivotValues = {
  p: DecimalString;
  r1: DecimalString;
  r2: DecimalString;
  r3: DecimalString;
  s1: DecimalString;
  s2: DecimalString;
  s3: DecimalString;
};

export type FibonacciPivotCalculation = {
  values: FibonacciPivotValues;
  quality: 'ok' | 'DEGENERATE_RANGE';
};

export type ReferencePeriodOHLC = {
  instrumentUid: string;
  timeframe: ReferenceTimeframe;
  periodId: string;
  start: Date;
  end: Date;
  high: DecimalString | string;
  low: DecimalString | string;
  close: DecimalString | string;
  isComplete: true;
  source: {
    provider: string;
    candleSource: string;
    interval: string;
    aggregationMethod: 'NATIVE' | 'AGGREGATED';
    sourceHash: string;
  };
};

export type TradingPeriod = {
  periodId: string;
  start: Date;
  end: Date;
};

export type CalculatedPivotPeriod = {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  referenceTimeframe: ReferenceTimeframe;
  sourcePeriodId: string;
  sourcePeriodStart: Date;
  sourcePeriodEnd: Date;
  sourceOHLC: {
    high: DecimalString;
    low: DecimalString;
    close: DecimalString;
  };
  validPeriodId: string;
  validFrom: Date;
  validTo: Date;
  levels: FibonacciPivotValues;
  quality: 'ok' | 'DEGENERATE_RANGE';
  algorithmId: typeof FIBONACCI_PIVOT_ALGORITHM_ID;
  algorithmVersion: typeof FIBONACCI_PIVOT_ALGORITHM_VERSION;
  configHash: string;
  sourceHash: string;
  calculatedAt: Date;
};

export type GenerateHistoricalPivotsResult = {
  periods: CalculatedPivotPeriod[];
  missingPeriodIds: string[];
};
