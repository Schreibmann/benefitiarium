import { add, compare, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { normalizedDistanceToLevel } from '../features/distance.js';
import { maxDecimal } from '../features/math.js';
import type { EngineCandle, EnginePivotSet } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';

export type LevelSource = 'FIB_PIVOT' | 'FIB_RETRACEMENT' | 'VOLUME_PROFILE' | 'SWING';

export type ContextualLevelRole =
  | 'SUPPORT_CANDIDATE'
  | 'RESISTANCE_CANDIDATE'
  | 'BROKEN_LEVEL'
  | 'NEUTRAL';

export type AnalyzedPriceLevel = {
  id: string;
  source: LevelSource;
  sourceId: string;
  price: DecimalString;
  zoneLow: DecimalString;
  zoneHigh: DecimalString;
  distanceAtr: DecimalString;
  contextualRole: ContextualLevelRole;
  isConfirmed: boolean;
};

export type FibonacciAnalysis = {
  pivotMethod: string | null;
  pivotVersion: string | null;
  levels: AnalyzedPriceLevel[];
  nearestAbove: AnalyzedPriceLevel | null;
  nearestBelow: AnalyzedPriceLevel | null;
  dataAvailable: boolean;
  warnings: string[];
};

export type FibonacciLevelConfig = {
  zoneAtrMultiple: number;
  brokenBufferAtrMultiple: number;
};

export const DEFAULT_FIBONACCI_LEVEL_CONFIG: FibonacciLevelConfig = {
  zoneAtrMultiple: 0.1,
  brokenBufferAtrMultiple: 0.05,
};

function zoneTolerance(
  tickSize: DecimalString,
  atr: DecimalString,
  config: FibonacciLevelConfig,
): DecimalString {
  return maxDecimal(multiply(tickSize, '2'), multiply(atr, String(config.zoneAtrMultiple)));
}

function classifyRole(
  levelPrice: DecimalString,
  candle: EngineCandle,
  tickSize: DecimalString,
  atr: DecimalString,
  config: FibonacciLevelConfig,
): ContextualLevelRole {
  const buffer = maxDecimal(
    multiply(tickSize, '2'),
    multiply(atr, String(config.brokenBufferAtrMultiple)),
  );
  if (compare(candle.close, add(levelPrice, buffer)) > 0) {
    return 'BROKEN_LEVEL';
  }
  if (compare(candle.close, subtract(levelPrice, buffer)) < 0) {
    return 'BROKEN_LEVEL';
  }
  if (compare(candle.close, levelPrice) >= 0 && compare(candle.low, levelPrice) <= 0) {
    return 'SUPPORT_CANDIDATE';
  }
  if (compare(candle.close, levelPrice) <= 0 && compare(candle.high, levelPrice) >= 0) {
    return 'RESISTANCE_CANDIDATE';
  }
  return 'NEUTRAL';
}

/**
 * Analyze Fibonacci Pivot levels into contextual zones. Does not invent retracement levels.
 */
export function analyzeFibonacciLevels(
  pivotSet: EnginePivotSet | null,
  referenceCandle: EngineCandle | null,
  atr: DecimalString | string,
  tickSize: DecimalString | string,
  config: Partial<FibonacciLevelConfig> = {},
): FibonacciAnalysis {
  const resolved: FibonacciLevelConfig = {
    ...DEFAULT_FIBONACCI_LEVEL_CONFIG,
    ...config,
  };
  const atrValue = parseDecimalString(String(atr));
  const tick = parseDecimalString(String(tickSize));

  if (pivotSet === null) {
    return {
      pivotMethod: null,
      pivotVersion: null,
      levels: [],
      nearestAbove: null,
      nearestBelow: null,
      dataAvailable: false,
      warnings: ['PIVOT_SET_UNAVAILABLE'],
    };
  }

  if (referenceCandle === null || !isClosedCandleEligibleForConfirmation(referenceCandle)) {
    return {
      pivotMethod: pivotSet.method,
      pivotVersion: pivotSet.version,
      levels: [],
      nearestAbove: null,
      nearestBelow: null,
      dataAvailable: true,
      warnings: ['REQUIRED_FEATURE_UNAVAILABLE'],
    };
  }

  const tolerance = zoneTolerance(tick, atrValue, resolved);
  const levels: AnalyzedPriceLevel[] = pivotSet.levels.map((level) => {
    const zoneLow = subtract(level.price, tolerance);
    const zoneHigh = add(level.price, tolerance);
    return {
      id: `FIB_PIVOT:${level.id}`,
      source: 'FIB_PIVOT',
      sourceId: String(level.id),
      price: level.price,
      zoneLow,
      zoneHigh,
      distanceAtr: normalizedDistanceToLevel(referenceCandle.close, level.price, atrValue, tick),
      contextualRole: classifyRole(level.price, referenceCandle, tick, atrValue, resolved),
      isConfirmed: pivotSet.isComplete,
    };
  });

  const above = levels
    .filter((level) => compare(level.price, referenceCandle.close) > 0)
    .sort((left, right) => compare(left.price, right.price));
  const below = levels
    .filter((level) => compare(level.price, referenceCandle.close) < 0)
    .sort((left, right) => compare(right.price, left.price));

  return {
    pivotMethod: pivotSet.method,
    pivotVersion: pivotSet.version,
    levels,
    nearestAbove: above[0] ?? null,
    nearestBelow: below[0] ?? null,
    dataAvailable: true,
    warnings: [],
  };
}
