import { add, compare, divide, multiply, subtract } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';
import {
  FIBONACCI_PIVOT_COEFFICIENTS,
  type FibonacciPivotCalculation,
  type FibonacciPivotValues,
  type PivotSourceOHLC,
} from './types.js';

function asDecimal(value: DecimalString | string, field: string): DecimalString {
  try {
    return parseDecimalString(typeof value === 'string' ? value : String(value));
  } catch {
    throw new Error(`Invalid pivot OHLC ${field}`);
  }
}

/**
 * Pure Fibonacci Pivot Points calculator (ADR fibonacci-pivot-points v1.0.0).
 * No I/O, no clock, no calendar.
 */
export function calculateFibonacciPivotPoints(source: PivotSourceOHLC): FibonacciPivotCalculation {
  const high = asDecimal(source.high, 'high');
  const low = asDecimal(source.low, 'low');
  const close = asDecimal(source.close, 'close');

  if (compare(high, low) < 0) {
    throw new Error('Invalid pivot OHLC: high < low');
  }
  if (compare(close, low) < 0 || compare(close, high) > 0) {
    throw new Error('Invalid pivot OHLC: close outside [low, high]');
  }

  const range = subtract(high, low);
  const pivot = divide(add(add(high, low), close), '3');

  if (compare(range, '0') === 0) {
    const values: FibonacciPivotValues = {
      p: pivot,
      r1: pivot,
      r2: pivot,
      r3: pivot,
      s1: pivot,
      s2: pivot,
      s3: pivot,
    };
    return { values, quality: 'DEGENERATE_RANGE' };
  }

  const values: FibonacciPivotValues = {
    p: pivot,
    r1: add(pivot, multiply(range, FIBONACCI_PIVOT_COEFFICIENTS.first)),
    r2: add(pivot, multiply(range, FIBONACCI_PIVOT_COEFFICIENTS.second)),
    r3: add(pivot, multiply(range, FIBONACCI_PIVOT_COEFFICIENTS.third)),
    s1: subtract(pivot, multiply(range, FIBONACCI_PIVOT_COEFFICIENTS.first)),
    s2: subtract(pivot, multiply(range, FIBONACCI_PIVOT_COEFFICIENTS.second)),
    s3: subtract(pivot, multiply(range, FIBONACCI_PIVOT_COEFFICIENTS.third)),
  };
  return { values, quality: 'ok' };
}
