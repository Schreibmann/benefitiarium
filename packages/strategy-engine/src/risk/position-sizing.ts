import { add, compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import { absDecimal } from '../features/math.js';
import type { EngineInstrumentSpec } from '../types.js';

export type PositionSizingConfig = {
  riskPerTradePct: number;
  maxRiskPerTradePct: number;
};

export const DEFAULT_POSITION_SIZING_CONFIG: PositionSizingConfig = {
  riskPerTradePct: 0.005,
  maxRiskPerTradePct: 0.01,
};

export type PositionSizingResult =
  | {
      ok: true;
      quantity: number;
      riskBudget: DecimalString;
      riskPerUnit: DecimalString;
      rawQuantity: DecimalString;
    }
  | {
      ok: false;
      reasonCodes: string[];
    };

/**
 * Risk-based size rounded down to quantityStep / lot constraints.
 */
export function sizePosition(input: {
  equity: DecimalString | string;
  entry: DecimalString | string;
  stop: DecimalString | string;
  pointValue: DecimalString | string;
  costPerUnit: DecimalString | string;
  instrument: EngineInstrumentSpec;
  config?: Partial<PositionSizingConfig>;
}): PositionSizingResult {
  const config: PositionSizingConfig = {
    ...DEFAULT_POSITION_SIZING_CONFIG,
    ...input.config,
  };
  if (config.riskPerTradePct > config.maxRiskPerTradePct) {
    return { ok: false, reasonCodes: ['DAILY_RISK_LIMIT_REACHED'] };
  }

  const equity = parseDecimalString(String(input.equity));
  const entry = parseDecimalString(String(input.entry));
  const stop = parseDecimalString(String(input.stop));
  const pointValue = parseDecimalString(String(input.pointValue));
  const cost = parseDecimalString(String(input.costPerUnit));

  const riskBudget = multiply(equity, String(config.riskPerTradePct));
  const riskPerUnit = add(multiply(absDecimal(subtract(entry, stop)), pointValue), cost);
  if (compare(riskPerUnit, '0') <= 0) {
    return { ok: false, reasonCodes: ['STOP_DISTANCE_TOO_SMALL'] };
  }

  const rawQuantity = divide(riskBudget, riskPerUnit);
  const step = input.instrument.quantityStep;
  const minQuantity = input.instrument.minQuantity;
  const lots = Math.floor(Number(String(rawQuantity)) / step) * step;

  if (!(lots >= minQuantity) || lots <= 0) {
    return { ok: false, reasonCodes: ['POSITION_SIZE_BELOW_MINIMUM'] };
  }

  return {
    ok: true,
    quantity: lots,
    riskBudget,
    riskPerUnit,
    rawQuantity,
  };
}
