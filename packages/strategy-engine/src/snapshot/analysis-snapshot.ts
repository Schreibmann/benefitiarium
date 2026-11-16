import type { DecimalString } from '@moex/domain';
import { analyzeFibonacciLevels, type FibonacciAnalysis } from '../analyzers/fibonacci-levels.js';
import {
  analyzeMarketStructure,
  type MarketStructureSnapshot,
} from '../analyzers/market-structure.js';
import { latestConfirmedAtr } from '../features/atr.js';
import { attachFallbackRvol, type CandleFeatures } from '../features/candle-features.js';
import {
  buildMtfContextSnapshot,
  type MtfAlignment,
  type MtfContextSnapshot,
  type MtfRoleConfig,
  scoreMtfAlignment,
} from '../mtf/as-of.js';
import type { EngineCandle, EnginePivotSet, EngineVolumeProfile } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';

export type AnalysisSnapshot = {
  decisionTimestamp: number;
  instrumentId: string;
  timeframe: EngineCandle['timeframe'];
  referenceCandle: EngineCandle | null;
  atr: DecimalString | null;
  candleFeatures: CandleFeatures | null;
  marketStructure: MarketStructureSnapshot;
  fibonacci: FibonacciAnalysis;
  volumeProfile: EngineVolumeProfile | null;
  mtf: MtfContextSnapshot | null;
  mtfAlignment: MtfAlignment | null;
  reasonCodes: string[];
};

export type BuildAnalysisSnapshotInput = {
  decisionTimestamp: number;
  setupCandles: readonly EngineCandle[];
  tickSize: string;
  pivotSet?: EnginePivotSet | null;
  volumeProfile?: EngineVolumeProfile | null;
  mtfRoleConfig?: MtfRoleConfig;
  candlesByTimeframe?: Partial<Record<EngineCandle['timeframe'], readonly EngineCandle[]>>;
  alignmentDirection?: 'LONG' | 'SHORT';
};

/**
 * Deterministic analysis snapshot at decisionTimestamp (closed data only).
 */
export function buildAnalysisSnapshot(input: BuildAnalysisSnapshotInput): AnalysisSnapshot {
  const asOfCandles = input.setupCandles
    .filter(isClosedCandleEligibleForConfirmation)
    .filter((candle) => candle.closeTimestamp <= input.decisionTimestamp)
    .slice()
    .sort((left, right) => left.timestamp - right.timestamp);

  const referenceCandle = asOfCandles[asOfCandles.length - 1] ?? null;
  const atr = latestConfirmedAtr(asOfCandles);
  const candleFeatures =
    referenceCandle === null ? null : attachFallbackRvol(referenceCandle, asOfCandles);

  const marketStructure = analyzeMarketStructure(asOfCandles, input.tickSize, {
    atr,
  });

  const fibonacci = analyzeFibonacciLevels(
    input.pivotSet ?? null,
    referenceCandle,
    atr ?? input.tickSize,
    input.tickSize,
  );

  const reasonCodes = [...marketStructure.reasonCodes, ...fibonacci.warnings];

  if (atr === null) {
    reasonCodes.push('REQUIRED_FEATURE_UNAVAILABLE');
  }

  let mtf: MtfContextSnapshot | null = null;
  let mtfAlignment: MtfAlignment | null = null;
  if (input.mtfRoleConfig !== undefined && input.candlesByTimeframe !== undefined) {
    mtf = buildMtfContextSnapshot({
      decisionTimestamp: input.decisionTimestamp,
      roleConfig: input.mtfRoleConfig,
      candlesByTimeframe: input.candlesByTimeframe,
    });
    if (input.alignmentDirection !== undefined) {
      mtfAlignment = scoreMtfAlignment({
        direction: input.alignmentDirection,
        mtf,
        tickSize: input.tickSize,
      });
      reasonCodes.push(...mtfAlignment.reasonCodes);
    }
  }

  return {
    decisionTimestamp: input.decisionTimestamp,
    instrumentId: referenceCandle?.instrumentId ?? asOfCandles[0]?.instrumentId ?? '',
    timeframe: referenceCandle?.timeframe ?? asOfCandles[0]?.timeframe ?? '5m',
    referenceCandle,
    atr,
    candleFeatures,
    marketStructure,
    fibonacci,
    volumeProfile: input.volumeProfile ?? null,
    mtf,
    mtfAlignment,
    reasonCodes: [...new Set(reasonCodes)],
  };
}
