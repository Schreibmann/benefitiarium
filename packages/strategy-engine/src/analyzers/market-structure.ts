import { add, compare, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { latestConfirmedAtr } from '../features/atr.js';
import { absDecimal, clamp01, maxDecimal, maxOfDecimals, minOfDecimals } from '../features/math.js';
import type { EngineCandle } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';

export const SWING_METHOD_ID = 'CONFIRMED_PIVOT_LR' as const;
export const SWING_METHOD_VERSION = '1.0.0' as const;

export type MarketRegime = 'BULLISH_TREND' | 'BEARISH_TREND' | 'RANGE' | 'TRANSITION' | 'UNKNOWN';

export type SwingKind = 'HIGH' | 'LOW';

export type StructureLabel = 'HH' | 'LH' | 'HL' | 'LL' | 'EQUAL';

export type SwingPoint = {
  id: string;
  kind: SwingKind;
  price: DecimalString;
  candleTimestamp: number;
  confirmedAt: number;
  confirmationBars: number;
  prominence: DecimalString;
  method: string;
  label: StructureLabel | null;
};

export type BosEvent = {
  direction: 'BULLISH' | 'BEARISH';
  at: number;
  level: DecimalString;
  candleTimestamp: number;
};

export type MarketStructureSnapshot = {
  regime: MarketRegime;
  confidence: number;
  swings: SwingPoint[];
  lastHigherHigh: SwingPoint | null;
  lastHigherLow: SwingPoint | null;
  lastLowerHigh: SwingPoint | null;
  lastLowerLow: SwingPoint | null;
  lastBullishBos: BosEvent | null;
  lastBearishBos: BosEvent | null;
  rangeHigh: DecimalString | null;
  rangeLow: DecimalString | null;
  reasonCodes: string[];
  method: string;
  methodVersion: string;
};

export type MarketStructureConfig = {
  leftBars: number;
  rightBars: number;
  minProminenceTicks: number;
  atrMultiple: number;
  structureLookbackBars: number;
  regimeConfirmBars: number;
  equalToleranceAtrMultiple: number;
};

export const DEFAULT_MARKET_STRUCTURE_CONFIG: MarketStructureConfig = {
  leftBars: 2,
  rightBars: 2,
  minProminenceTicks: 4,
  atrMultiple: 0.5,
  structureLookbackBars: 40,
  regimeConfirmBars: 2,
  equalToleranceAtrMultiple: 0.1,
};

function bosBuffer(tickSize: DecimalString, atr: DecimalString): DecimalString {
  return maxDecimal(multiply(tickSize, '2'), multiply(atr, '0.05'));
}

function minProminence(
  tickSize: DecimalString,
  atr: DecimalString,
  config: MarketStructureConfig,
): DecimalString {
  return maxDecimal(
    multiply(tickSize, String(config.minProminenceTicks)),
    multiply(atr, String(config.atrMultiple)),
  );
}

function structuralTolerance(atr: DecimalString, config: MarketStructureConfig): DecimalString {
  return multiply(atr, String(config.equalToleranceAtrMultiple));
}

function labelSwing(
  kind: SwingKind,
  price: DecimalString,
  previousSameKind: SwingPoint | null,
  atr: DecimalString,
  config: MarketStructureConfig,
): StructureLabel | null {
  if (previousSameKind === null) {
    return null;
  }
  const tolerance = structuralTolerance(atr, config);
  const delta = absDecimal(subtract(price, previousSameKind.price));
  if (compare(delta, tolerance) <= 0) {
    return 'EQUAL';
  }
  if (kind === 'HIGH') {
    return compare(price, previousSameKind.price) > 0 ? 'HH' : 'LH';
  }
  return compare(price, previousSameKind.price) > 0 ? 'HL' : 'LL';
}

function detectSwings(
  candles: readonly EngineCandle[],
  tickSize: DecimalString,
  atr: DecimalString,
  config: MarketStructureConfig,
): SwingPoint[] {
  const closed = candles.filter(isClosedCandleEligibleForConfirmation);
  const swings: SwingPoint[] = [];
  const prominenceFloor = minProminence(tickSize, atr, config);
  let lastHigh: SwingPoint | null = null;
  let lastLow: SwingPoint | null = null;

  for (let index = config.leftBars; index < closed.length - config.rightBars; index += 1) {
    const candidate = closed[index];
    if (candidate === undefined) {
      continue;
    }

    const left = closed.slice(index - config.leftBars, index);
    const right = closed.slice(index + 1, index + 1 + config.rightBars);
    if (left.length !== config.leftBars || right.length !== config.rightBars) {
      continue;
    }

    const isSwingHigh =
      left.every((bar) => compare(candidate.high, bar.high) > 0) &&
      right.every((bar) => compare(candidate.high, bar.high) >= 0);
    const isSwingLow =
      left.every((bar) => compare(candidate.low, bar.low) < 0) &&
      right.every((bar) => compare(candidate.low, bar.low) <= 0);

    const confirmedAt = right[right.length - 1]?.closeTimestamp;
    if (confirmedAt === undefined) {
      continue;
    }

    if (isSwingHigh) {
      const moveAway = absDecimal(subtract(candidate.high, candidate.close));
      const rightExtremeMove = maxOfDecimals(
        right.map((bar) => absDecimal(subtract(candidate.high, bar.low))),
      );
      const prominence = maxDecimal(moveAway, rightExtremeMove);
      if (compare(prominence, prominenceFloor) >= 0) {
        const swing: SwingPoint = {
          id: `H:${candidate.timestamp}`,
          kind: 'HIGH',
          price: candidate.high,
          candleTimestamp: candidate.timestamp,
          confirmedAt,
          confirmationBars: config.rightBars,
          prominence,
          method: SWING_METHOD_ID,
          label: labelSwing('HIGH', candidate.high, lastHigh, atr, config),
        };
        swings.push(swing);
        lastHigh = swing;
      }
    }

    if (isSwingLow) {
      const moveAway = absDecimal(subtract(candidate.close, candidate.low));
      const rightExtremeMove = maxOfDecimals(
        right.map((bar) => absDecimal(subtract(bar.high, candidate.low))),
      );
      const prominence = maxDecimal(moveAway, rightExtremeMove);
      if (compare(prominence, prominenceFloor) >= 0) {
        const swing: SwingPoint = {
          id: `L:${candidate.timestamp}`,
          kind: 'LOW',
          price: candidate.low,
          candleTimestamp: candidate.timestamp,
          confirmedAt,
          confirmationBars: config.rightBars,
          prominence,
          method: SWING_METHOD_ID,
          label: labelSwing('LOW', candidate.low, lastLow, atr, config),
        };
        swings.push(swing);
        lastLow = swing;
      }
    }
  }

  return swings;
}

function detectBosEvents(
  candles: readonly EngineCandle[],
  swings: readonly SwingPoint[],
  tickSize: DecimalString,
  atr: DecimalString,
): BosEvent[] {
  const closed = candles.filter(isClosedCandleEligibleForConfirmation);
  const buffer = bosBuffer(tickSize, atr);
  const events: BosEvent[] = [];

  for (const candle of closed) {
    const priorHighs = swings.filter(
      (swing) =>
        swing.kind === 'HIGH' &&
        swing.confirmedAt <= candle.closeTimestamp &&
        swing.candleTimestamp < candle.timestamp,
    );
    const priorLows = swings.filter(
      (swing) =>
        swing.kind === 'LOW' &&
        swing.confirmedAt <= candle.closeTimestamp &&
        swing.candleTimestamp < candle.timestamp,
    );
    const lastHigh = priorHighs[priorHighs.length - 1];
    const lastLow = priorLows[priorLows.length - 1];

    if (lastHigh !== undefined) {
      const breakLevel = add(lastHigh.price, buffer);
      if (compare(candle.close, breakLevel) > 0) {
        events.push({
          direction: 'BULLISH',
          at: candle.closeTimestamp,
          level: lastHigh.price,
          candleTimestamp: candle.timestamp,
        });
      }
    }

    if (lastLow !== undefined) {
      const breakLevel = subtract(lastLow.price, buffer);
      if (compare(candle.close, breakLevel) < 0) {
        events.push({
          direction: 'BEARISH',
          at: candle.closeTimestamp,
          level: lastLow.price,
          candleTimestamp: candle.timestamp,
        });
      }
    }
  }

  return events;
}

function classifyRegime(
  swings: readonly SwingPoint[],
  bosEvents: readonly BosEvent[],
  candles: readonly EngineCandle[],
  tickSize: DecimalString,
  atr: DecimalString,
  config: MarketStructureConfig,
): { regime: MarketRegime; confidence: number; reasonCodes: string[] } {
  const closed = candles.filter(isClosedCandleEligibleForConfirmation);
  if (closed.length < config.leftBars + config.rightBars + 1) {
    return { regime: 'UNKNOWN', confidence: 0, reasonCodes: ['REGIME_UNKNOWN'] };
  }

  const recentSwings = swings.slice(-config.structureLookbackBars);
  const hasHH = recentSwings.some((swing) => swing.label === 'HH');
  const hasHL = recentSwings.some((swing) => swing.label === 'HL');
  const hasLH = recentSwings.some((swing) => swing.label === 'LH');
  const hasLL = recentSwings.some((swing) => swing.label === 'LL');

  const lastBullishBos = [...bosEvents].reverse().find((event) => event.direction === 'BULLISH');
  const lastBearishBos = [...bosEvents].reverse().find((event) => event.direction === 'BEARISH');
  const latest = closed[closed.length - 1];
  const buffer = bosBuffer(tickSize, atr);

  const protectedHl = [...recentSwings].reverse().find((swing) => swing.label === 'HL');
  const protectedLh = [...recentSwings].reverse().find((swing) => swing.label === 'LH');

  if (
    latest !== undefined &&
    protectedHl !== undefined &&
    compare(latest.close, subtract(protectedHl.price, buffer)) < 0
  ) {
    return { regime: 'TRANSITION', confidence: 0.6, reasonCodes: ['REGIME_TRANSITION'] };
  }
  if (
    latest !== undefined &&
    protectedLh !== undefined &&
    compare(latest.close, add(protectedLh.price, buffer)) > 0
  ) {
    return { regime: 'TRANSITION', confidence: 0.6, reasonCodes: ['REGIME_TRANSITION'] };
  }

  if (hasHH && hasHL && lastBearishBos === undefined) {
    const confidence = clamp01(0.55 + (lastBullishBos !== undefined ? 0.25 : 0));
    return { regime: 'BULLISH_TREND', confidence, reasonCodes: ['REGIME_BULLISH'] };
  }
  if (hasLH && hasLL && lastBullishBos === undefined) {
    const confidence = clamp01(0.55 + (lastBearishBos !== undefined ? 0.25 : 0));
    return { regime: 'BEARISH_TREND', confidence, reasonCodes: ['REGIME_BEARISH'] };
  }

  const highs = recentSwings.filter((swing) => swing.kind === 'HIGH').map((swing) => swing.price);
  const lows = recentSwings.filter((swing) => swing.kind === 'LOW').map((swing) => swing.price);
  if (highs.length >= 2 && lows.length >= 2) {
    return { regime: 'RANGE', confidence: 0.45, reasonCodes: ['REGIME_RANGE'] };
  }

  return { regime: 'UNKNOWN', confidence: 0.2, reasonCodes: ['REGIME_UNKNOWN'] };
}

/**
 * Deterministic market-structure snapshot from closed candles only.
 */
export function analyzeMarketStructure(
  candles: readonly EngineCandle[],
  tickSize: DecimalString | string,
  options: {
    atr?: DecimalString | null;
    config?: Partial<MarketStructureConfig>;
  } = {},
): MarketStructureSnapshot {
  const config: MarketStructureConfig = {
    ...DEFAULT_MARKET_STRUCTURE_CONFIG,
    ...options.config,
  };
  const tick = parseDecimalString(String(tickSize));
  const atr = options.atr ?? latestConfirmedAtr(candles) ?? parseDecimalString(String(tick));

  const swings = detectSwings(candles, tick, atr, config);
  const bosEvents = detectBosEvents(candles, swings, tick, atr);
  const classification = classifyRegime(swings, bosEvents, candles, tick, atr, config);

  const lastHigherHigh = [...swings].reverse().find((swing) => swing.label === 'HH') ?? null;
  const lastHigherLow = [...swings].reverse().find((swing) => swing.label === 'HL') ?? null;
  const lastLowerHigh = [...swings].reverse().find((swing) => swing.label === 'LH') ?? null;
  const lastLowerLow = [...swings].reverse().find((swing) => swing.label === 'LL') ?? null;
  const lastBullishBos =
    [...bosEvents].reverse().find((event) => event.direction === 'BULLISH') ?? null;
  const lastBearishBos =
    [...bosEvents].reverse().find((event) => event.direction === 'BEARISH') ?? null;

  const highPrices = swings.filter((swing) => swing.kind === 'HIGH').map((swing) => swing.price);
  const lowPrices = swings.filter((swing) => swing.kind === 'LOW').map((swing) => swing.price);

  return {
    regime: classification.regime,
    confidence: classification.confidence,
    swings,
    lastHigherHigh,
    lastHigherLow,
    lastLowerHigh,
    lastLowerLow,
    lastBullishBos,
    lastBearishBos,
    rangeHigh: highPrices.length > 0 ? maxOfDecimals(highPrices) : null,
    rangeLow: lowPrices.length > 0 ? minOfDecimals(lowPrices) : null,
    reasonCodes: classification.reasonCodes,
    method: SWING_METHOD_ID,
    methodVersion: SWING_METHOD_VERSION,
  };
}
