import { add, compare, divide, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import type { ConfluenceZone } from '../confluence/confluence.js';
import { computeCandleFeatures } from '../features/candle-features.js';
import { clamp01, maxDecimal, toNumber } from '../features/math.js';
import type { EngineCandle, EngineDirection } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';

export type PriceActionPattern =
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'BULLISH_REJECTION'
  | 'BEARISH_REJECTION'
  | 'BULLISH_BREAKOUT_CLOSE'
  | 'BEARISH_BREAKOUT_CLOSE'
  | 'BULLISH_RECLAIM'
  | 'BEARISH_RECLAIM';

export type PriceActionEvidence = {
  pattern: PriceActionPattern;
  direction: EngineDirection | 'NEUTRAL';
  candleTimestamp: number;
  zoneId: string | null;
  strength: number;
  features: Record<string, number | boolean | string>;
  confirmed: boolean;
};

export type PriceActionConfig = {
  rejectionCloseLocationMin: number;
  rejectionWickRatioMin: number;
  engulfingBodyRatioMin: number;
};

export const DEFAULT_PRICE_ACTION_CONFIG: PriceActionConfig = {
  rejectionCloseLocationMin: 0.65,
  rejectionWickRatioMin: 0.35,
  engulfingBodyRatioMin: 0.4,
};

function intersectsZone(candle: EngineCandle, zone: ConfluenceZone): boolean {
  return compare(candle.low, zone.high) <= 0 && compare(candle.high, zone.low) >= 0;
}

function wickRatio(wick: DecimalString, range: DecimalString, tickSize: DecimalString): number {
  const denom = maxDecimal(range, tickSize);
  return toNumber(divide(wick, denom));
}

function detectEngulfing(
  previous: EngineCandle,
  current: EngineCandle,
  config: PriceActionConfig,
): PriceActionEvidence | null {
  const prevFeatures = computeCandleFeatures(previous);
  const currFeatures = computeCandleFeatures(current);
  if (currFeatures.bodyRatio < config.engulfingBodyRatioMin) {
    return null;
  }

  const bullish =
    prevFeatures.isBearish &&
    currFeatures.isBullish &&
    compare(current.open, previous.close) <= 0 &&
    compare(current.close, previous.open) >= 0;
  const bearish =
    prevFeatures.isBullish &&
    currFeatures.isBearish &&
    compare(current.open, previous.close) >= 0 &&
    compare(current.close, previous.open) <= 0;

  if (!bullish && !bearish) {
    return null;
  }

  return {
    pattern: bullish ? 'BULLISH_ENGULFING' : 'BEARISH_ENGULFING',
    direction: bullish ? 'LONG' : 'SHORT',
    candleTimestamp: current.timestamp,
    zoneId: null,
    strength: clamp01(0.55 + currFeatures.bodyRatio * 0.4),
    features: {
      bodyRatio: currFeatures.bodyRatio,
      previousBodyRatio: prevFeatures.bodyRatio,
    },
    confirmed: true,
  };
}

function detectRejection(
  candle: EngineCandle,
  zone: ConfluenceZone,
  tickSize: DecimalString,
  config: PriceActionConfig,
): PriceActionEvidence | null {
  if (!intersectsZone(candle, zone)) {
    return null;
  }
  const features = computeCandleFeatures(candle);
  const lowerRatio = wickRatio(features.lowerWick, features.range, tickSize);
  const upperRatio = wickRatio(features.upperWick, features.range, tickSize);

  const bullish =
    compare(candle.close, zone.low) >= 0 &&
    features.closeLocation >= config.rejectionCloseLocationMin &&
    lowerRatio >= config.rejectionWickRatioMin;
  const bearish =
    compare(candle.close, zone.high) <= 0 &&
    features.closeLocation <= 1 - config.rejectionCloseLocationMin &&
    upperRatio >= config.rejectionWickRatioMin;

  if (!bullish && !bearish) {
    return null;
  }

  return {
    pattern: bullish ? 'BULLISH_REJECTION' : 'BEARISH_REJECTION',
    direction: bullish ? 'LONG' : 'SHORT',
    candleTimestamp: candle.timestamp,
    zoneId: zone.id,
    strength: clamp01(
      0.5 +
        (bullish ? features.closeLocation : 1 - features.closeLocation) * 0.3 +
        (bullish ? lowerRatio : upperRatio) * 0.2,
    ),
    features: {
      closeLocation: features.closeLocation,
      lowerWickRatio: lowerRatio,
      upperWickRatio: upperRatio,
    },
    confirmed: true,
  };
}

function detectBreakoutClose(
  candle: EngineCandle,
  level: DecimalString,
  direction: EngineDirection,
  buffer: DecimalString,
): PriceActionEvidence | null {
  if (direction === 'LONG' && compare(candle.close, add(level, buffer)) > 0) {
    return {
      pattern: 'BULLISH_BREAKOUT_CLOSE',
      direction: 'LONG',
      candleTimestamp: candle.timestamp,
      zoneId: null,
      strength: 0.7,
      features: { level: String(level), close: String(candle.close) },
      confirmed: true,
    };
  }
  if (direction === 'SHORT' && compare(candle.close, subtract(level, buffer)) < 0) {
    return {
      pattern: 'BEARISH_BREAKOUT_CLOSE',
      direction: 'SHORT',
      candleTimestamp: candle.timestamp,
      zoneId: null,
      strength: 0.7,
      features: { level: String(level), close: String(candle.close) },
      confirmed: true,
    };
  }
  return null;
}

function detectReclaim(
  candle: EngineCandle,
  zone: ConfluenceZone,
  direction: EngineDirection,
): PriceActionEvidence | null {
  if (direction === 'LONG') {
    const penetrated = compare(candle.low, zone.low) < 0;
    const closedBack = compare(candle.close, zone.low) >= 0;
    if (penetrated && closedBack) {
      return {
        pattern: 'BULLISH_RECLAIM',
        direction: 'LONG',
        candleTimestamp: candle.timestamp,
        zoneId: zone.id,
        strength: 0.75,
        features: { low: String(candle.low), close: String(candle.close) },
        confirmed: true,
      };
    }
  }
  if (direction === 'SHORT') {
    const penetrated = compare(candle.high, zone.high) > 0;
    const closedBack = compare(candle.close, zone.high) <= 0;
    if (penetrated && closedBack) {
      return {
        pattern: 'BEARISH_RECLAIM',
        direction: 'SHORT',
        candleTimestamp: candle.timestamp,
        zoneId: zone.id,
        strength: 0.75,
        features: { high: String(candle.high), close: String(candle.close) },
        confirmed: true,
      };
    }
  }
  return null;
}

/**
 * Detect closed-candle price-action evidence around existing zones/levels.
 */
export function analyzePriceAction(input: {
  candles: readonly EngineCandle[];
  zones?: readonly ConfluenceZone[];
  breakoutLevel?: DecimalString | null;
  breakoutDirection?: EngineDirection;
  breakoutBuffer?: DecimalString | string;
  tickSize: DecimalString | string;
  config?: Partial<PriceActionConfig>;
}): PriceActionEvidence[] {
  const config: PriceActionConfig = {
    ...DEFAULT_PRICE_ACTION_CONFIG,
    ...input.config,
  };
  const closed = input.candles.filter(isClosedCandleEligibleForConfirmation);
  const current = closed[closed.length - 1];
  if (current === undefined) {
    return [];
  }
  const previous = closed.length >= 2 ? closed[closed.length - 2] : undefined;
  const tick = parseDecimalString(String(input.tickSize));
  const evidence: PriceActionEvidence[] = [];

  if (previous !== undefined) {
    const engulfing = detectEngulfing(previous, current, config);
    if (engulfing !== null) {
      evidence.push(engulfing);
    }
  }

  for (const zone of input.zones ?? []) {
    const rejection = detectRejection(current, zone, tick, config);
    if (rejection !== null) {
      evidence.push(rejection);
    }
    const reclaimLong = detectReclaim(current, zone, 'LONG');
    if (reclaimLong !== null) {
      evidence.push(reclaimLong);
    }
    const reclaimShort = detectReclaim(current, zone, 'SHORT');
    if (reclaimShort !== null) {
      evidence.push(reclaimShort);
    }
  }

  if (
    input.breakoutLevel !== undefined &&
    input.breakoutLevel !== null &&
    input.breakoutDirection !== undefined
  ) {
    const buffer = parseDecimalString(String(input.breakoutBuffer ?? tick));
    const breakout = detectBreakoutClose(
      current,
      input.breakoutLevel,
      input.breakoutDirection,
      buffer,
    );
    if (breakout !== null) {
      evidence.push(breakout);
    }
  }

  return evidence;
}

export function strongestDirectionalEvidence(
  evidence: readonly PriceActionEvidence[],
  direction: EngineDirection,
): PriceActionEvidence | null {
  const matched = evidence.filter((item) => item.confirmed && item.direction === direction);
  if (matched.length === 0) {
    return null;
  }
  return matched.reduce((best, item) => (item.strength > best.strength ? item : best));
}
