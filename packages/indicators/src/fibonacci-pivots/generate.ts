import { parseDecimalString } from '@moex/domain';
import { calculateFibonacciPivotPoints } from './calculate.js';
import { fibonacciPivotConfigHash } from './config-hash.js';
import {
  type CalculatedPivotPeriod,
  type ChartTimeframe,
  FIBONACCI_PIVOT_ALGORITHM_ID,
  FIBONACCI_PIVOT_ALGORITHM_VERSION,
  FIBONACCI_PIVOT_TIMEFRAME_MAP,
  type GenerateHistoricalPivotsResult,
  type ReferencePeriodOHLC,
  type TradingPeriod,
} from './types.js';

export type GenerateHistoricalPivotsInput = {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  sourcePeriods: readonly ReferencePeriodOHLC[];
  targetPeriods: readonly TradingPeriod[];
  /** Injected for tests; default Date.now. */
  now?: () => Date;
};

/**
 * For each target period T[n], use the immediately previous complete source period S[n-1].
 * Never assign a source period's levels to itself (anti-look-ahead).
 */
export function generateHistoricalPivots(
  input: GenerateHistoricalPivotsInput,
): GenerateHistoricalPivotsResult {
  const referenceTimeframe = FIBONACCI_PIVOT_TIMEFRAME_MAP[input.chartTimeframe];
  const configHash = fibonacciPivotConfigHash();
  const now = input.now ?? (() => new Date());

  const sources = [...input.sourcePeriods]
    .filter((period) => period.timeframe === referenceTimeframe && period.isComplete)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const targets = [...input.targetPeriods].sort((a, b) => a.start.getTime() - b.start.getTime());

  const periods: CalculatedPivotPeriod[] = [];
  const missingPeriodIds: string[] = [];

  for (const target of targets) {
    const previous = findPreviousSource(sources, target.start);
    if (previous === null) {
      missingPeriodIds.push(target.periodId);
      continue;
    }

    const calculation = calculateFibonacciPivotPoints({
      high: previous.high,
      low: previous.low,
      close: previous.close,
    });

    periods.push({
      instrumentUid: input.instrumentUid,
      chartTimeframe: input.chartTimeframe,
      referenceTimeframe,
      sourcePeriodId: previous.periodId,
      sourcePeriodStart: previous.start,
      sourcePeriodEnd: previous.end,
      sourceOHLC: {
        high: parseDecimalString(String(previous.high)),
        low: parseDecimalString(String(previous.low)),
        close: parseDecimalString(String(previous.close)),
      },
      validPeriodId: target.periodId,
      validFrom: target.start,
      validTo: target.end,
      levels: calculation.values,
      quality: calculation.quality,
      algorithmId: FIBONACCI_PIVOT_ALGORITHM_ID,
      algorithmVersion: FIBONACCI_PIVOT_ALGORITHM_VERSION,
      configHash,
      sourceHash: previous.source.sourceHash,
      calculatedAt: now(),
    });
  }

  return { periods, missingPeriodIds };
}

function findPreviousSource(
  sources: readonly ReferencePeriodOHLC[],
  targetStart: Date,
): ReferencePeriodOHLC | null {
  let previous: ReferencePeriodOHLC | null = null;
  for (const source of sources) {
    // Previous completed period ends at or before the target start (half-open periods).
    if (source.end.getTime() <= targetStart.getTime()) {
      previous = source;
      continue;
    }
    break;
  }
  return previous;
}
