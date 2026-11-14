import { compare, divide, multiply, subtract } from '@moex/decimal';

/** True when previous is strictly below level and price is at or above level. */
export function crossedUp(previousPrice: string, price: string, level: string): boolean {
  return compare(previousPrice, level) < 0 && compare(price, level) >= 0;
}

/** True when previous is strictly above level and price is at or below level. */
export function crossedDown(previousPrice: string, price: string, level: string): boolean {
  return compare(previousPrice, level) > 0 && compare(price, level) <= 0;
}

/**
 * Absolute percent distance from price to level: |price - level| / level * 100.
 * Returns null when level is zero (cannot normalize).
 */
export function percentDistanceToLevel(price: string, level: string): string | null {
  if (compare(level, '0') === 0) {
    return null;
  }
  const absDiff = compare(price, level) >= 0 ? subtract(price, level) : subtract(level, price);
  return multiply(divide(absDiff, level), '100');
}

export function isWithinPercent(
  price: string,
  level: string,
  pct: string,
): { within: boolean; distancePct: string | null; side: 'above' | 'below' | 'at' } {
  const cmp = compare(price, level);
  const side = cmp > 0 ? 'above' : cmp < 0 ? 'below' : 'at';
  const distancePct = percentDistanceToLevel(price, level);
  if (distancePct === null) {
    return { within: false, distancePct: null, side };
  }
  return {
    within: compare(distancePct, pct) <= 0,
    distancePct,
    side,
  };
}

export function leftApproachBand(price: string, level: string, pct: string): boolean {
  const distancePct = percentDistanceToLevel(price, level);
  if (distancePct === null) {
    return true;
  }
  const exitThreshold = multiply(pct, '2');
  return compare(distancePct, exitThreshold) > 0;
}
