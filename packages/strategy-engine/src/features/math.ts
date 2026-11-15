import { add, compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';

export function absDecimal(value: DecimalString | string): DecimalString {
  if (compare(value, '0') < 0) {
    return subtract('0', value);
  }
  return parseDecimalString(String(value));
}

export function maxDecimal(
  first: DecimalString | string,
  ...rest: Array<DecimalString | string>
): DecimalString {
  return maxOfDecimals([first, ...rest]);
}

export function minDecimal(
  first: DecimalString | string,
  ...rest: Array<DecimalString | string>
): DecimalString {
  return minOfDecimals([first, ...rest]);
}

export function maxOfDecimals(values: readonly (DecimalString | string)[]): DecimalString {
  const first = values[0];
  if (first === undefined) {
    throw new Error('maxOfDecimals requires at least one value');
  }
  let best = parseDecimalString(String(first));
  for (let index = 1; index < values.length; index += 1) {
    const candidate = values[index];
    if (candidate !== undefined && compare(candidate, best) > 0) {
      best = parseDecimalString(String(candidate));
    }
  }
  return best;
}

export function minOfDecimals(values: readonly (DecimalString | string)[]): DecimalString {
  const first = values[0];
  if (first === undefined) {
    throw new Error('minOfDecimals requires at least one value');
  }
  let best = parseDecimalString(String(first));
  for (let index = 1; index < values.length; index += 1) {
    const candidate = values[index];
    if (candidate !== undefined && compare(candidate, best) < 0) {
      best = parseDecimalString(String(candidate));
    }
  }
  return best;
}

export function medianDecimal(values: readonly (DecimalString | string)[]): DecimalString | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => compare(left, right));
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    const odd = sorted[mid];
    if (odd === undefined) {
      return null;
    }
    return parseDecimalString(String(odd));
  }
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left === undefined || right === undefined) {
    return null;
  }
  return divide(add(left, right), '2');
}

export function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function toNumber(value: DecimalString | string): number {
  return Number(String(value));
}

export function safeDivide(
  numerator: DecimalString | string,
  denominator: DecimalString | string,
): DecimalString | null {
  if (compare(denominator, '0') === 0) {
    return null;
  }
  return divide(numerator, denominator);
}

export function weightedAverage(values: readonly DecimalString[]): DecimalString | null {
  if (values.length === 0) {
    return null;
  }
  let sum = parseDecimalString('0');
  for (const value of values) {
    sum = add(sum, value);
  }
  return divide(sum, String(values.length));
}

export function scaleDecimal(
  value: DecimalString | string,
  factor: DecimalString | string,
): DecimalString {
  return multiply(value, factor);
}
