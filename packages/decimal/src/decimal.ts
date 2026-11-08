import { type DecimalString, parseDecimalString } from '@moex/domain';
import { Decimal as DecimalJs } from 'decimal.js';

DecimalJs.set({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40,
});

export type RoundingMode = 'roundHalfUp' | 'roundDown' | 'roundUp' | 'roundFloor' | 'roundCeil';

const roundingMap: Record<RoundingMode, DecimalJs.Rounding> = {
  roundHalfUp: DecimalJs.ROUND_HALF_UP,
  roundDown: DecimalJs.ROUND_DOWN,
  roundUp: DecimalJs.ROUND_UP,
  roundFloor: DecimalJs.ROUND_FLOOR,
  roundCeil: DecimalJs.ROUND_CEIL,
};

function toDecimal(value: DecimalString | string): DecimalJs {
  const normalized = typeof value === 'string' ? parseDecimalString(value) : value;
  return new DecimalJs(normalized);
}

function toDecimalString(value: DecimalJs): DecimalString {
  // toString() drops insignificant trailing zeros while staying exact.
  return parseDecimalString(value.toString());
}

export function parse(value: string): DecimalString {
  return parseDecimalString(value);
}

export function format(value: DecimalString | string, fractionDigits?: number): string {
  const decimal = toDecimal(value);
  if (fractionDigits === undefined) {
    return decimal.toString();
  }
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0) {
    throw new Error('fractionDigits must be a non-negative integer');
  }
  return decimal.toFixed(fractionDigits);
}

export function compare(left: DecimalString | string, right: DecimalString | string): -1 | 0 | 1 {
  const result = toDecimal(left).cmp(toDecimal(right));
  if (result < 0) {
    return -1;
  }
  if (result > 0) {
    return 1;
  }
  return 0;
}

export function add(left: DecimalString | string, right: DecimalString | string): DecimalString {
  return toDecimalString(toDecimal(left).plus(toDecimal(right)));
}

export function subtract(
  left: DecimalString | string,
  right: DecimalString | string,
): DecimalString {
  return toDecimalString(toDecimal(left).minus(toDecimal(right)));
}

export function multiply(
  left: DecimalString | string,
  right: DecimalString | string,
): DecimalString {
  return toDecimalString(toDecimal(left).times(toDecimal(right)));
}

export function divide(left: DecimalString | string, right: DecimalString | string): DecimalString {
  const divisor = toDecimal(right);
  if (divisor.isZero()) {
    throw new Error('Division by zero');
  }
  return toDecimalString(toDecimal(left).div(divisor));
}

export function roundToTick(
  price: DecimalString | string,
  tickSize: DecimalString | string,
  mode: RoundingMode = 'roundHalfUp',
): DecimalString {
  const tick = toDecimal(tickSize);
  // decimal.js treats 0 as isPositive() === true; require strictly greater than zero.
  if (tick.lte(0)) {
    throw new Error('tickSize must be positive');
  }

  const value = toDecimal(price);
  const ticks = value.div(tick);
  const roundedTicks = ticks.toDecimalPlaces(0, roundingMap[mode]);
  return toDecimalString(roundedTicks.times(tick));
}

export function quantityToLots(
  quantity: DecimalString | string,
  lotSize: number,
  mode: RoundingMode = 'roundDown',
): number {
  if (!Number.isInteger(lotSize) || lotSize <= 0) {
    throw new Error('lotSize must be a positive integer');
  }

  const lots = toDecimal(quantity).div(lotSize).toDecimalPlaces(0, roundingMap[mode]);
  if (!lots.isInteger()) {
    throw new Error('lot conversion produced a non-integer result');
  }

  const asNumber = lots.toNumber();
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error('lot quantity exceeds safe integer range');
  }
  if (asNumber < 0) {
    throw new Error('lot quantity must be non-negative');
  }
  return asNumber;
}

export function lotsToQuantity(lots: number, lotSize: number): DecimalString {
  if (!Number.isInteger(lots) || lots < 0) {
    throw new Error('lots must be a non-negative integer');
  }
  if (!Number.isInteger(lotSize) || lotSize <= 0) {
    throw new Error('lotSize must be a positive integer');
  }
  return toDecimalString(new DecimalJs(lots).times(lotSize));
}

export function isMultipleOfTick(
  price: DecimalString | string,
  tickSize: DecimalString | string,
): boolean {
  const tick = toDecimal(tickSize);
  if (tick.lte(0)) {
    throw new Error('tickSize must be positive');
  }
  return toDecimal(price).mod(tick).isZero();
}
