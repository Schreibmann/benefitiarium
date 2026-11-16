import { compare, divide, subtract } from '@moex/decimal';
import type { DecimalString } from '@moex/domain';
import type { EngineCandle } from '../types.js';
import { isClosedCandleEligibleForConfirmation } from '../validate.js';
import { absDecimal, maxDecimal, medianDecimal, minDecimal, toNumber } from './math.js';

export const DEFAULT_RVOL_LOOKBACK = 20;

export type CandleFeatures = {
  body: DecimalString;
  range: DecimalString;
  bodyRatio: number;
  upperWick: DecimalString;
  lowerWick: DecimalString;
  closeLocation: number;
  isBullish: boolean;
  isBearish: boolean;
  isDoji: boolean;
  isFlat: boolean;
  relativeVolume: number | null;
};

export type RvolEvidenceBucket =
  | { maxExclusive: number; evidence: number }
  | { minInclusive: number; evidence: number };

/** Spec §7.3 starting mapping for score normalization. */
export const DEFAULT_RVOL_EVIDENCE_BUCKETS: readonly RvolEvidenceBucket[] = [
  { maxExclusive: 0.7, evidence: 0 },
  { maxExclusive: 1.0, evidence: 0.2 },
  { maxExclusive: 1.2, evidence: 0.4 },
  { maxExclusive: 1.5, evidence: 0.67 },
  { minInclusive: 1.5, evidence: 1 },
];

export function computeCandleFeatures(
  candle: EngineCandle,
  options: {
    dojiBodyRatioMax?: number;
    relativeVolume?: number | null;
  } = {},
): CandleFeatures {
  const dojiBodyRatioMax = options.dojiBodyRatioMax ?? 0.1;
  const range = subtract(candle.high, candle.low);
  const body = absDecimal(subtract(candle.close, candle.open));
  const isFlat = compare(range, '0') === 0;
  const bodyRatio = isFlat ? 0 : toNumber(divide(body, range));
  const upperWick = subtract(candle.high, maxDecimal(candle.open, candle.close));
  const lowerWick = subtract(minDecimal(candle.open, candle.close), candle.low);
  const closeLocation = isFlat ? 0.5 : toNumber(divide(subtract(candle.close, candle.low), range));
  const isBullish = compare(candle.close, candle.open) > 0;
  const isBearish = compare(candle.close, candle.open) < 0;

  return {
    body,
    range,
    bodyRatio,
    upperWick,
    lowerWick,
    closeLocation,
    isBullish,
    isBearish,
    isDoji: bodyRatio <= dojiBodyRatioMax,
    isFlat,
    relativeVolume: options.relativeVolume ?? null,
  };
}

/**
 * Fallback RVOL: volume / median(prior n closed volumes). Current candle excluded.
 */
export function computeFallbackRvol(
  candle: EngineCandle,
  priorClosedCandles: readonly EngineCandle[],
  lookback: number = DEFAULT_RVOL_LOOKBACK,
): number | null {
  if (!(Number.isInteger(lookback) && lookback > 0)) {
    throw new Error('RVOL lookback must be a positive integer');
  }

  const baseline = priorClosedCandles
    .filter(isClosedCandleEligibleForConfirmation)
    .filter((item) => item.timestamp < candle.timestamp)
    .slice(-lookback)
    .map((item) => item.volume);

  if (baseline.length < lookback) {
    return null;
  }

  const median = medianDecimal(baseline);
  if (median === null || compare(median, '0') === 0) {
    return null;
  }

  return toNumber(divide(candle.volume, median));
}

export function rvolToEvidenceScore(
  rvol: number | null,
  buckets: readonly RvolEvidenceBucket[] = DEFAULT_RVOL_EVIDENCE_BUCKETS,
): number | null {
  if (rvol === null || !Number.isFinite(rvol)) {
    return null;
  }
  for (const bucket of buckets) {
    if ('maxExclusive' in bucket && rvol < bucket.maxExclusive) {
      return bucket.evidence;
    }
    if ('minInclusive' in bucket && rvol >= bucket.minInclusive) {
      return bucket.evidence;
    }
  }
  return null;
}

export function attachFallbackRvol(
  candle: EngineCandle,
  history: readonly EngineCandle[],
  lookback: number = DEFAULT_RVOL_LOOKBACK,
): CandleFeatures {
  const prior = history.filter(
    (item) => isClosedCandleEligibleForConfirmation(item) && item.timestamp < candle.timestamp,
  );
  const relativeVolume = computeFallbackRvol(candle, prior, lookback);
  return computeCandleFeatures(candle, { relativeVolume });
}
