import { compare, divide, type RoundingMode, roundToTick, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { absDecimal, maxDecimal } from './math.js';

export type PriceZone = {
  low: DecimalString;
  high: DecimalString;
};

/**
 * DistanceNorm(p,l) = |p-l| / max(ATR, TickSize)
 */
export function normalizedDistanceToLevel(
  price: DecimalString | string,
  level: DecimalString | string,
  atr: DecimalString | string,
  tickSize: DecimalString | string,
): DecimalString {
  const denominator = maxDecimal(atr, tickSize);
  return divide(absDecimal(subtract(price, level)), denominator);
}

/**
 * Distance to zone is 0 when inside; else distance to nearest boundary / max(ATR, tick).
 */
export function normalizedDistanceToZone(
  price: DecimalString | string,
  zone: PriceZone,
  atr: DecimalString | string,
  tickSize: DecimalString | string,
): DecimalString {
  if (compare(zone.low, zone.high) > 0) {
    throw new Error('zone.low must be <= zone.high');
  }
  if (compare(price, zone.low) >= 0 && compare(price, zone.high) <= 0) {
    return parseDecimalString('0');
  }
  const nearest = compare(price, zone.low) < 0 ? zone.low : zone.high;
  return normalizedDistanceToLevel(price, nearest, atr, tickSize);
}

export type StopRoundingSide = 'LONG' | 'SHORT';

/**
 * Protective stop rounding: LONG rounds down, SHORT rounds up (never closer to market).
 */
export function roundProtectiveStop(
  price: DecimalString | string,
  tickSize: DecimalString | string,
  side: StopRoundingSide,
): DecimalString {
  const mode: RoundingMode = side === 'LONG' ? 'roundDown' : 'roundUp';
  return roundToTick(price, tickSize, mode);
}
