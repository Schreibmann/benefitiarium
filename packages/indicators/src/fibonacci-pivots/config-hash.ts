import { createHash } from 'node:crypto';
import {
  FIBONACCI_PIVOT_ALGORITHM_ID,
  FIBONACCI_PIVOT_ALGORITHM_VERSION,
  FIBONACCI_PIVOT_COEFFICIENTS,
} from './types.js';

/** Stable hash of algorithm identity + coefficients (ADR config_hash). */
export function fibonacciPivotConfigHash(): string {
  const payload = JSON.stringify({
    algorithmId: FIBONACCI_PIVOT_ALGORITHM_ID,
    algorithmVersion: FIBONACCI_PIVOT_ALGORITHM_VERSION,
    coefficients: FIBONACCI_PIVOT_COEFFICIENTS,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}
