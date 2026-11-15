import { compare } from '@moex/decimal';
import type { DecimalString } from '@moex/domain';
import type { MarketRegime } from '../analyzers/market-structure.js';
import type { ConfluenceZone } from '../confluence/confluence.js';
import { normalizedDistanceToZone } from '../features/distance.js';
import { toNumber } from '../features/math.js';
import type { SignalScore } from '../scoring/types.js';
import type { TradingSetup } from '../strategies/types.js';
import type { EngineDirection, EngineInstrumentSpec, StrategyId } from '../types.js';

export type GateResult = {
  passed: boolean;
  reasonCodes: string[];
};

export type DataGateInput = {
  candleStale: boolean;
  hasGap: boolean;
  pivotAvailable: boolean;
  volumeProfileAvailable: boolean;
  instrumentSpecAvailable: boolean;
  eventOrderingTrusted: boolean;
  recoveringFromReplay: boolean;
};

export function evaluateDataGates(input: DataGateInput): GateResult {
  const reasonCodes: string[] = [];
  if (input.candleStale) {
    reasonCodes.push('DATA_STALE');
  }
  if (input.hasGap) {
    reasonCodes.push('DATA_GAP_DETECTED');
  }
  if (!input.pivotAvailable) {
    reasonCodes.push('PIVOT_SET_UNAVAILABLE');
  }
  if (!input.volumeProfileAvailable) {
    reasonCodes.push('VOLUME_PROFILE_UNAVAILABLE');
  }
  if (!input.instrumentSpecAvailable) {
    reasonCodes.push('INSTRUMENT_SPEC_UNAVAILABLE');
  }
  if (!input.eventOrderingTrusted) {
    reasonCodes.push('DATA_LATE_EVENT');
  }
  if (input.recoveringFromReplay) {
    reasonCodes.push('DATA_CORRECTION_REPLAY_REQUIRED');
  }
  return { passed: reasonCodes.length === 0, reasonCodes };
}

export type MarketGateInput = {
  strategy: StrategyId;
  direction: EngineDirection;
  regime: MarketRegime;
  setup: TradingSetup | null;
  zone: ConfluenceZone | null;
  price: DecimalString | string;
  atr: DecimalString | string;
  tickSize: DecimalString | string;
  maxChaseDistanceAtr: number;
  sessionAllowsEntry: boolean;
};

export function evaluateMarketGates(input: MarketGateInput): GateResult {
  const reasonCodes: string[] = [];

  const regimeAligned =
    (input.strategy === 'RANGE_REVERSAL' && input.regime === 'RANGE') ||
    (input.direction === 'LONG' && input.regime === 'BULLISH_TREND') ||
    (input.direction === 'SHORT' && input.regime === 'BEARISH_TREND') ||
    (input.strategy === 'BREAKOUT_RETEST' &&
      (input.regime === 'BULLISH_TREND' ||
        input.regime === 'BEARISH_TREND' ||
        input.regime === 'RANGE' ||
        input.regime === 'TRANSITION'));

  if (!regimeAligned) {
    reasonCodes.push('SETUP_OPPOSING_REGIME');
  }

  if (input.setup === null || input.setup.status === 'EXPIRED') {
    reasonCodes.push('SETUP_EXPIRED');
  } else if (input.setup.status === 'INVALIDATED') {
    reasonCodes.push('SETUP_INVALIDATED');
  } else if (input.setup.status !== 'TRIGGERED') {
    reasonCodes.push('SETUP_TOO_FAR_FROM_ZONE');
  }

  if (input.zone === null) {
    reasonCodes.push('SETUP_TOO_FAR_FROM_ZONE');
  } else {
    const distance = toNumber(
      normalizedDistanceToZone(input.price, input.zone, input.atr, input.tickSize),
    );
    if (distance > input.maxChaseDistanceAtr) {
      reasonCodes.push('SETUP_TOO_FAR_FROM_ZONE');
    }
  }

  if (!input.sessionAllowsEntry) {
    reasonCodes.push('SESSION_ENTRY_BLOCKED');
  }

  return { passed: reasonCodes.length === 0, reasonCodes };
}

export type RiskRewardGateInput = {
  entry: DecimalString | string;
  stop: DecimalString | string;
  target: DecimalString | string;
  pointValue: DecimalString | string;
  roundTripCostPerUnit: DecimalString | string;
  minRewardRisk: number;
};

export function evaluateRewardRiskGate(input: RiskRewardGateInput): GateResult & {
  rewardRisk: number | null;
} {
  const entry = Number(String(input.entry));
  const stop = Number(String(input.stop));
  const target = Number(String(input.target));
  const pointValue = Number(String(input.pointValue));
  const cost = Number(String(input.roundTripCostPerUnit));

  const riskPerUnit = Math.abs(entry - stop) * pointValue + cost;
  const rewardPerUnit = Math.abs(target - entry) * pointValue - cost;

  if (!(riskPerUnit > 0) || !(rewardPerUnit > 0)) {
    return {
      passed: false,
      reasonCodes: ['RISK_REWARD_TOO_LOW'],
      rewardRisk: null,
    };
  }

  const rewardRisk = rewardPerUnit / riskPerUnit;
  if (rewardRisk < input.minRewardRisk) {
    return {
      passed: false,
      reasonCodes: ['RISK_REWARD_TOO_LOW'],
      rewardRisk,
    };
  }
  return { passed: true, reasonCodes: [], rewardRisk };
}

export type DuplicateCooldownGateInput = {
  hasDuplicateActiveSetup: boolean;
  hasOpenPositionForSymbol: boolean;
  cooldownActive: boolean;
};

export function evaluateDuplicateCooldownGates(input: DuplicateCooldownGateInput): GateResult {
  const reasonCodes: string[] = [];
  if (input.hasDuplicateActiveSetup) {
    reasonCodes.push('DUPLICATE_ACTIVE_SETUP');
  }
  if (input.hasOpenPositionForSymbol) {
    reasonCodes.push('POSITION_ALREADY_OPEN');
  }
  if (input.cooldownActive) {
    reasonCodes.push('COOLDOWN_ACTIVE');
  }
  return { passed: reasonCodes.length === 0, reasonCodes };
}

export type HardGateBundleInput = {
  data: DataGateInput;
  market: MarketGateInput;
  rewardRisk: RiskRewardGateInput;
  duplicates: DuplicateCooldownGateInput;
  score: SignalScore;
  instrumentSpec: EngineInstrumentSpec | null;
};

export type HardGateBundleResult = {
  passed: boolean;
  reasonCodes: string[];
  rewardRisk: number | null;
};

/**
 * Hard gates are independent of score magnitude.
 */
export function evaluateHardGates(input: HardGateBundleInput): HardGateBundleResult {
  const reasonCodes: string[] = [];

  if (input.instrumentSpec === null) {
    reasonCodes.push('INSTRUMENT_SPEC_UNAVAILABLE');
  }

  const data = evaluateDataGates(input.data);
  const market = evaluateMarketGates(input.market);
  const reward = evaluateRewardRiskGate(input.rewardRisk);
  const duplicates = evaluateDuplicateCooldownGates(input.duplicates);

  reasonCodes.push(
    ...data.reasonCodes,
    ...market.reasonCodes,
    ...reward.reasonCodes,
    ...duplicates.reasonCodes,
  );

  if (input.score.classification !== 'CONFIRMED' && input.score.classification !== 'STRONG') {
    reasonCodes.push('SCORE_BELOW_THRESHOLD');
  }

  if (input.score.selectedDirection === null) {
    reasonCodes.push('SCORE_DIRECTIONAL_GAP_INSUFFICIENT');
  }

  return {
    passed: reasonCodes.length === 0,
    reasonCodes: [...new Set(reasonCodes)],
    rewardRisk: reward.rewardRisk,
  };
}

export function stopDistanceTicks(
  entry: DecimalString | string,
  stop: DecimalString | string,
  tickSize: DecimalString | string,
): number {
  const distance = Math.abs(Number(String(entry)) - Number(String(stop)));
  const tick = Number(String(tickSize));
  if (!(tick > 0)) {
    return 0;
  }
  return distance / tick;
}

export function isStopDistanceValid(input: {
  entry: DecimalString | string;
  stop: DecimalString | string;
  atr: DecimalString | string;
  tickSize: DecimalString | string;
  minStopDistanceTicks: number;
  maxStopDistanceAtr: number;
}): GateResult {
  const ticks = stopDistanceTicks(input.entry, input.stop, input.tickSize);
  const atr = Number(String(input.atr));
  const distance = Math.abs(Number(String(input.entry)) - Number(String(input.stop)));
  const reasonCodes: string[] = [];
  if (ticks < input.minStopDistanceTicks) {
    reasonCodes.push('STOP_DISTANCE_TOO_SMALL');
  }
  if (atr > 0 && distance / atr > input.maxStopDistanceAtr) {
    reasonCodes.push('STOP_DISTANCE_TOO_LARGE');
  }
  if (compare(String(input.entry), String(input.stop)) === 0) {
    reasonCodes.push('STOP_DISTANCE_TOO_SMALL');
  }
  return { passed: reasonCodes.length === 0, reasonCodes };
}
