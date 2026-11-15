import { add, compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import type { AnalyzedPriceLevel } from '../analyzers/fibonacci-levels.js';
import { roundProtectiveStop } from '../features/distance.js';
import { absDecimal, maxDecimal, toNumber } from '../features/math.js';
import type { EngineDirection } from '../types.js';

export type EntryReferences = {
  signalReferencePrice: DecimalString;
  signalTimestamp: number;
  executionReferencePrice: DecimalString | null;
};

export type StopLossResult = {
  rawStop: DecimalString;
  stop: DecimalString;
  buffer: DecimalString;
  invalidationSource: string;
  reasonCodes: string[];
};

export type TakeProfitCandidate = {
  id: string;
  price: DecimalString;
  source: string;
  rewardRisk: number | null;
  accepted: boolean;
  reasonCodes: string[];
};

export type TakeProfitSelection = {
  candidates: TakeProfitCandidate[];
  selected: TakeProfitCandidate[];
};

export type EntryRiskConfig = {
  stopBufferAtrMultiple: number;
  minStopDistanceTicks: number;
  maxStopDistanceAtr: number;
  minRewardRisk: number;
  fixedRMultiples: number[];
};

export const DEFAULT_ENTRY_RISK_CONFIG: EntryRiskConfig = {
  stopBufferAtrMultiple: 0.15,
  minStopDistanceTicks: 2,
  maxStopDistanceAtr: 3,
  minRewardRisk: 1.5,
  fixedRMultiples: [1.5, 2.5, 4],
};

export function buildEntryReferences(input: {
  confirmationClose: DecimalString | string;
  signalTimestamp: number;
  executionReferencePrice?: DecimalString | string | null;
}): EntryReferences {
  return {
    signalReferencePrice: parseDecimalString(String(input.confirmationClose)),
    signalTimestamp: input.signalTimestamp,
    executionReferencePrice:
      input.executionReferencePrice === undefined || input.executionReferencePrice === null
        ? null
        : parseDecimalString(String(input.executionReferencePrice)),
  };
}

function stopBuffer(tickSize: DecimalString, atr: DecimalString, multiple: number): DecimalString {
  return maxDecimal(multiply(tickSize, '2'), multiply(atr, String(multiple)));
}

/**
 * Structural stop from invalidation level ± buffer, tick-rounded protectively.
 */
export function computeStructuralStop(input: {
  direction: EngineDirection;
  invalidationLevel: DecimalString | string;
  invalidationSource: string;
  atr: DecimalString | string;
  tickSize: DecimalString | string;
  config?: Partial<EntryRiskConfig>;
}): StopLossResult {
  const config: EntryRiskConfig = { ...DEFAULT_ENTRY_RISK_CONFIG, ...input.config };
  const atr = parseDecimalString(String(input.atr));
  const tick = parseDecimalString(String(input.tickSize));
  const invalidation = parseDecimalString(String(input.invalidationLevel));
  const buffer = stopBuffer(tick, atr, config.stopBufferAtrMultiple);
  const rawStop =
    input.direction === 'LONG' ? subtract(invalidation, buffer) : add(invalidation, buffer);
  const stop = roundProtectiveStop(rawStop, tick, input.direction);
  return {
    rawStop,
    stop,
    buffer,
    invalidationSource: input.invalidationSource,
    reasonCodes: [],
  };
}

function rewardRisk(
  entry: DecimalString,
  stop: DecimalString,
  target: DecimalString,
  pointValue: DecimalString,
  costPerUnit: DecimalString,
): number | null {
  const risk = add(multiply(absDecimal(subtract(entry, stop)), pointValue), costPerUnit);
  const reward = subtract(multiply(absDecimal(subtract(target, entry)), pointValue), costPerUnit);
  if (compare(risk, '0') <= 0 || compare(reward, '0') <= 0) {
    return null;
  }
  return toNumber(divide(reward, risk));
}

/**
 * Rank structural targets and optional fixed-R fallbacks; prefer structure when RR is comparable.
 */
export function selectTakeProfitCandidates(input: {
  direction: EngineDirection;
  entry: DecimalString | string;
  stop: DecimalString | string;
  atr: DecimalString | string;
  pointValue: DecimalString | string;
  costPerUnit: DecimalString | string;
  structuralLevels: readonly AnalyzedPriceLevel[];
  config?: Partial<EntryRiskConfig>;
}): TakeProfitSelection {
  const config: EntryRiskConfig = { ...DEFAULT_ENTRY_RISK_CONFIG, ...input.config };
  const entry = parseDecimalString(String(input.entry));
  const stop = parseDecimalString(String(input.stop));
  const pointValue = parseDecimalString(String(input.pointValue));
  const cost = parseDecimalString(String(input.costPerUnit));
  const riskDistance = absDecimal(subtract(entry, stop));
  // input.atr reserved for future structural-target distance ranking

  const structural: TakeProfitCandidate[] = input.structuralLevels.map((level) => {
    const onSide =
      input.direction === 'LONG'
        ? compare(level.price, entry) > 0
        : compare(level.price, entry) < 0;
    if (!onSide) {
      return {
        id: level.id,
        price: level.price,
        source: level.source,
        rewardRisk: null,
        accepted: false,
        reasonCodes: ['SETUP_TOO_FAR_FROM_ZONE'],
      };
    }
    const rr = rewardRisk(entry, stop, level.price, pointValue, cost);
    const accepted = rr !== null && rr >= config.minRewardRisk;
    return {
      id: level.id,
      price: level.price,
      source: level.source,
      rewardRisk: rr,
      accepted,
      reasonCodes: accepted ? [] : ['RISK_REWARD_TOO_LOW'],
    };
  });

  const fixed: TakeProfitCandidate[] = config.fixedRMultiples.map((multiple) => {
    const offset = multiply(riskDistance, String(multiple));
    const price = input.direction === 'LONG' ? add(entry, offset) : subtract(entry, offset);
    const rr = rewardRisk(entry, stop, price, pointValue, cost);
    const accepted = rr !== null && rr >= config.minRewardRisk;
    return {
      id: `FIXED_R:${multiple}`,
      price,
      source: 'FIXED_R',
      rewardRisk: rr,
      accepted,
      reasonCodes: accepted ? [] : ['RISK_REWARD_TOO_LOW'],
    };
  });

  const candidates = [...structural, ...fixed];
  const acceptedStructural = structural
    .filter((item) => item.accepted)
    .sort((left, right) => (left.rewardRisk ?? 0) - (right.rewardRisk ?? 0));
  const acceptedFixed = fixed.filter((item) => item.accepted);

  const selected: TakeProfitCandidate[] = [];
  if (acceptedStructural[0] !== undefined) {
    selected.push(acceptedStructural[0]);
  } else if (acceptedFixed[0] !== undefined) {
    // Fallback only when no structural target clears min RR.
    selected.push(acceptedFixed[0]);
  }
  for (const item of acceptedFixed) {
    if (selected.length >= 3) {
      break;
    }
    if (!selected.some((existing) => existing.id === item.id)) {
      selected.push(item);
    }
  }

  return { candidates, selected };
}
