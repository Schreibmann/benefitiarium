import { type CandleInterval, type DecimalString, parseDecimalString } from '@moex/domain';
import {
  type ChartTimeframe,
  calculateFibonacciPivotPoints,
  FIBONACCI_PIVOT_ALGORITHM_ID,
  FIBONACCI_PIVOT_ALGORITHM_VERSION,
  FIBONACCI_PIVOT_TIMEFRAME_MAP,
  type PivotSourceOHLC,
  type ReferenceTimeframe,
} from '@moex/indicators';
import type { ReasonCode } from '../reason-codes.js';
import type { EnginePivotLevel, EnginePivotSet } from '../types.js';

export type FibonacciPivotAdapterInput = {
  chartTimeframe: CandleInterval;
  sourceOHLC: PivotSourceOHLC;
  anchorStart: number;
  anchorEnd: number;
  calculationTimestamp: number;
  isComplete: boolean;
};

export type FibonacciPivotAdapterResult =
  | { ok: true; pivotSet: EnginePivotSet }
  | { ok: false; reasonCodes: ReasonCode[]; message: string };

function isChartTimeframe(value: CandleInterval): value is ChartTimeframe {
  return value === '1m' || value === '5m' || value === '1h';
}

function toLevels(values: {
  p: DecimalString;
  r1: DecimalString;
  r2: DecimalString;
  r3: DecimalString;
  s1: DecimalString;
  s2: DecimalString;
  s3: DecimalString;
}): EnginePivotLevel[] {
  return [
    { id: 'P', price: values.p },
    { id: 'R1', price: values.r1 },
    { id: 'R2', price: values.r2 },
    { id: 'R3', price: values.r3 },
    { id: 'S1', price: values.s1 },
    { id: 'S2', price: values.s2 },
    { id: 'S3', price: values.s3 },
  ];
}

/**
 * Thin adapter over `@moex/indicators` Fibonacci Pivot Points.
 * Does not reimplement the pivot formula.
 */
export function adaptFibonacciPivotSet(
  input: FibonacciPivotAdapterInput,
): FibonacciPivotAdapterResult {
  if (!isChartTimeframe(input.chartTimeframe)) {
    return {
      ok: false,
      reasonCodes: ['PIVOT_MAPPING_UNSUPPORTED'],
      message: `No Fibonacci pivot mapping for timeframe ${input.chartTimeframe}`,
    };
  }

  const anchorPeriod: ReferenceTimeframe = FIBONACCI_PIVOT_TIMEFRAME_MAP[input.chartTimeframe];

  try {
    const calculation = calculateFibonacciPivotPoints(input.sourceOHLC);
    const pivotSet: EnginePivotSet = {
      method: FIBONACCI_PIVOT_ALGORITHM_ID,
      version: FIBONACCI_PIVOT_ALGORITHM_VERSION,
      anchorPeriod,
      anchorStart: input.anchorStart,
      anchorEnd: input.anchorEnd,
      calculationTimestamp: input.calculationTimestamp,
      sourceOHLC: {
        high: parseDecimalString(String(input.sourceOHLC.high)),
        low: parseDecimalString(String(input.sourceOHLC.low)),
        close: parseDecimalString(String(input.sourceOHLC.close)),
      },
      levels: toLevels(calculation.values),
      isComplete: input.isComplete,
      quality: calculation.quality,
    };
    return { ok: true, pivotSet };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'pivot calculation failed';
    return {
      ok: false,
      reasonCodes: ['PIVOT_SET_UNAVAILABLE'],
      message,
    };
  }
}

export function resolvePivotAnchorPeriod(
  chartTimeframe: CandleInterval,
): ReferenceTimeframe | null {
  if (!isChartTimeframe(chartTimeframe)) {
    return null;
  }
  return FIBONACCI_PIVOT_TIMEFRAME_MAP[chartTimeframe];
}
