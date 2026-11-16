import type { DecimalString } from '@moex/domain';
import type { AnalyzedPriceLevel } from '../analyzers/fibonacci-levels.js';
import type { MarketStructureSnapshot } from '../analyzers/market-structure.js';
import type { PriceActionEvidence } from '../analyzers/price-action.js';
import type { ConfluenceZone } from '../confluence/confluence.js';
import {
  type DataGateInput,
  type DuplicateCooldownGateInput,
  evaluateHardGates,
  isStopDistanceValid,
} from '../gates/eligibility.js';
import type { MtfAlignment } from '../mtf/as-of.js';
import {
  buildEntryReferences,
  computeStructuralStop,
  type EntryReferences,
  type StopLossResult,
  selectTakeProfitCandidates,
  type TakeProfitSelection,
} from '../risk/entry-stop-target.js';
import { type PositionSizingResult, sizePosition } from '../risk/position-sizing.js';
import {
  fibonacciEvidence,
  mtfEvidence,
  priceActionEvidence,
  regimeEvidence,
  scoreSignal,
  volumeEvidence,
  volumeProfileEvidence,
} from '../scoring/score-signal.js';
import type { SignalScore } from '../scoring/types.js';
import type { TradingSetup } from '../strategies/types.js';
import type { EngineDirection, EngineInstrumentSpec, StrategyId } from '../types.js';

export type ConfirmedSignalDecision = {
  accepted: boolean;
  direction: EngineDirection | null;
  score: SignalScore;
  entry: EntryReferences;
  stop: StopLossResult | null;
  takeProfit: TakeProfitSelection | null;
  sizing: PositionSizingResult | null;
  rewardRisk: number | null;
  reasonCodes: string[];
};

export type ConfirmSignalInput = {
  strategy: StrategyId;
  setup: TradingSetup;
  marketStructure: MarketStructureSnapshot;
  zone: ConfluenceZone | null;
  priceAction: readonly PriceActionEvidence[];
  rvol: number | null;
  mtfAlignment: MtfAlignment | null;
  volumeProfileApproximate?: boolean;
  structuralTargets: readonly AnalyzedPriceLevel[];
  instrument: EngineInstrumentSpec;
  equity: DecimalString | string;
  costPerUnit: DecimalString | string;
  atr: DecimalString | string;
  confirmationClose: DecimalString | string;
  signalTimestamp: number;
  executionReferencePrice?: DecimalString | string | null;
  dataGates: DataGateInput;
  duplicates: DuplicateCooldownGateInput;
  sessionAllowsEntry?: boolean;
  maxChaseDistanceAtr?: number;
  configVersion: string;
};

/**
 * Build an explainable confirmed/rejected signal with score, gates, and risk numbers.
 */
export function confirmSignal(input: ConfirmSignalInput): ConfirmedSignalDecision {
  const longEvidence = {
    marketRegime: regimeEvidence(input.marketStructure.regime, 'LONG', input.strategy),
    fibonacci: fibonacciEvidence(input.zone),
    volumeProfile: volumeProfileEvidence(input.zone, input.volumeProfileApproximate ?? false),
    priceAction: priceActionEvidence(input.priceAction, 'LONG'),
    volume: volumeEvidence(input.rvol),
    mtf: mtfEvidence(input.mtfAlignment),
  };
  const shortEvidence = {
    marketRegime: regimeEvidence(input.marketStructure.regime, 'SHORT', input.strategy),
    fibonacci: fibonacciEvidence(input.zone),
    volumeProfile: volumeProfileEvidence(input.zone, input.volumeProfileApproximate ?? false),
    priceAction: priceActionEvidence(input.priceAction, 'SHORT'),
    volume: volumeEvidence(input.rvol),
    mtf: mtfEvidence(input.mtfAlignment),
  };

  const score = scoreSignal({
    long: longEvidence,
    short: shortEvidence,
    configVersion: input.configVersion,
  });

  const direction = score.selectedDirection ?? input.setup.direction;
  const entry = buildEntryReferences({
    confirmationClose: input.confirmationClose,
    signalTimestamp: input.signalTimestamp,
    executionReferencePrice: input.executionReferencePrice ?? null,
  });
  const executable = entry.executionReferencePrice ?? entry.signalReferencePrice;

  const invalidation =
    input.setup.invalidationLevel ??
    (input.zone === null ? null : direction === 'LONG' ? input.zone.low : input.zone.high);

  if (invalidation === null) {
    return {
      accepted: false,
      direction,
      score,
      entry,
      stop: null,
      takeProfit: null,
      sizing: null,
      rewardRisk: null,
      reasonCodes: [...score.reasonCodes, 'SETUP_INVALIDATED'],
    };
  }

  const stop = computeStructuralStop({
    direction,
    invalidationLevel: invalidation,
    invalidationSource: input.setup.invalidationLevel !== null ? 'SETUP' : 'ZONE',
    atr: input.atr,
    tickSize: input.instrument.tickSize,
  });

  const stopGate = isStopDistanceValid({
    entry: executable,
    stop: stop.stop,
    atr: input.atr,
    tickSize: input.instrument.tickSize,
    minStopDistanceTicks: 2,
    maxStopDistanceAtr: 3,
  });

  const takeProfit = selectTakeProfitCandidates({
    direction,
    entry: executable,
    stop: stop.stop,
    atr: input.atr,
    pointValue: input.instrument.pointValue,
    costPerUnit: input.costPerUnit,
    structuralLevels: input.structuralTargets,
  });

  const primaryTarget = takeProfit.selected[0];
  if (primaryTarget === undefined) {
    return {
      accepted: false,
      direction,
      score,
      entry,
      stop,
      takeProfit,
      sizing: null,
      rewardRisk: null,
      reasonCodes: [...score.reasonCodes, ...stopGate.reasonCodes, 'RISK_REWARD_TOO_LOW'],
    };
  }

  const gates = evaluateHardGates({
    data: input.dataGates,
    market: {
      strategy: input.strategy,
      direction,
      regime: input.marketStructure.regime,
      setup: input.setup,
      zone: input.zone,
      price: executable,
      atr: input.atr,
      tickSize: input.instrument.tickSize,
      maxChaseDistanceAtr: input.maxChaseDistanceAtr ?? 0.5,
      sessionAllowsEntry: input.sessionAllowsEntry ?? true,
    },
    rewardRisk: {
      entry: executable,
      stop: stop.stop,
      target: primaryTarget.price,
      pointValue: input.instrument.pointValue,
      roundTripCostPerUnit: input.costPerUnit,
      minRewardRisk: 1.5,
    },
    duplicates: input.duplicates,
    score,
    instrumentSpec: input.instrument,
  });

  const sizing = sizePosition({
    equity: input.equity,
    entry: executable,
    stop: stop.stop,
    pointValue: input.instrument.pointValue,
    costPerUnit: input.costPerUnit,
    instrument: input.instrument,
  });

  const reasonCodes = [
    ...score.reasonCodes,
    ...stopGate.reasonCodes,
    ...gates.reasonCodes,
    ...(sizing.ok ? [] : sizing.reasonCodes),
  ];

  const accepted =
    gates.passed &&
    stopGate.passed &&
    sizing.ok &&
    input.setup.status === 'TRIGGERED' &&
    (score.classification === 'CONFIRMED' || score.classification === 'STRONG');

  return {
    accepted,
    direction: accepted ? direction : null,
    score,
    entry,
    stop,
    takeProfit,
    sizing,
    rewardRisk: gates.rewardRisk,
    reasonCodes: [...new Set(reasonCodes)],
  };
}
