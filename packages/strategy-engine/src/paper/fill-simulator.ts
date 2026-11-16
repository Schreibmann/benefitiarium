import { add, compare, multiply, type RoundingMode, roundToTick, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { absDecimal } from '../features/math.js';
import type { EngineDirection } from '../types.js';

export type PaperFillConfig = {
  /** Half-spread in ticks applied adversely to the fill. */
  halfSpreadTicks: number;
  /** Extra slippage in ticks applied adversely to the fill. */
  slippageTicks: number;
};

export const DEFAULT_PAPER_FILL_CONFIG: PaperFillConfig = {
  halfSpreadTicks: 1,
  slippageTicks: 1,
};

export type PaperFillResult = {
  fillPrice: DecimalString;
  referencePrice: DecimalString;
  adverseTicks: number;
  slippagePaid: DecimalString;
  reasonCodes: string[];
};

/**
 * Conservative paper fill: never better than reference; apply adverse spread+slippage
 * and round away from the market. Does not use prices after the decision timestamp.
 */
export function simulatePaperFill(input: {
  direction: EngineDirection;
  referencePrice: DecimalString | string;
  tickSize: DecimalString | string;
  config?: Partial<PaperFillConfig>;
}): PaperFillResult {
  const config: PaperFillConfig = {
    ...DEFAULT_PAPER_FILL_CONFIG,
    ...input.config,
  };
  const reference = parseDecimalString(String(input.referencePrice));
  const tick = parseDecimalString(String(input.tickSize));
  if (compare(tick, '0') <= 0) {
    throw new Error('tickSize must be > 0');
  }

  const adverseTicks = Math.max(0, config.halfSpreadTicks) + Math.max(0, config.slippageTicks);
  const adverseOffset = multiply(tick, String(adverseTicks));

  let rawFill: DecimalString;
  let mode: RoundingMode;
  if (input.direction === 'LONG') {
    rawFill = add(reference, adverseOffset);
    mode = 'roundUp';
  } else {
    rawFill = subtract(reference, adverseOffset);
    mode = 'roundDown';
  }

  const fillPrice = roundToTick(rawFill, tick, mode);
  const slippagePaid = absDecimal(subtract(fillPrice, reference));

  return {
    fillPrice,
    referencePrice: reference,
    adverseTicks,
    slippagePaid,
    reasonCodes: [],
  };
}
