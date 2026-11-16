import { compare, parse as parseDecimal } from '@moex/decimal';
import { parseDecimalString } from '@moex/domain';
import type {
  EngineCandle,
  EngineInstrumentSpec,
  ValidationIssue,
  ValidationResult,
} from './types.js';

function isFiniteDecimalString(value: string): boolean {
  try {
    const parsed = parseDecimal(value);
    return Number.isFinite(Number(parsed));
  } catch {
    return false;
  }
}

export function validateOhlcv(candle: EngineCandle): ValidationResult<EngineCandle> {
  const issues: ValidationIssue[] = [];

  const fields: Array<{ path: string; value: string }> = [
    { path: 'open', value: candle.open },
    { path: 'high', value: candle.high },
    { path: 'low', value: candle.low },
    { path: 'close', value: candle.close },
    { path: 'volume', value: candle.volume },
  ];

  for (const field of fields) {
    if (!isFiniteDecimalString(field.value)) {
      issues.push({
        reasonCode: 'DATA_INVALID_OHLCV',
        message: `${field.path} must be a finite decimal`,
        path: field.path,
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const open = candle.open;
  const high = candle.high;
  const low = candle.low;
  const close = candle.close;
  const volume = candle.volume;
  const zero = parseDecimalString('0');

  const maxOc = compare(open, close) >= 0 ? open : close;
  const minOc = compare(open, close) <= 0 ? open : close;

  if (compare(high, maxOc) < 0) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'high must be >= max(open, close)',
      path: 'high',
    });
  }

  if (compare(high, low) < 0) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'high must be >= low',
      path: 'high',
    });
  }

  if (compare(low, minOc) > 0) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'low must be <= min(open, close)',
      path: 'low',
    });
  }

  if (compare(volume, zero) < 0) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'volume must be >= 0',
      path: 'volume',
    });
  }

  if (!(candle.closeTimestamp > candle.timestamp)) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'closeTimestamp must be greater than timestamp',
      path: 'closeTimestamp',
    });
  }

  if (!(Number.isInteger(candle.revision) && candle.revision >= 0)) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'revision must be a non-negative integer',
      path: 'revision',
    });
  }

  if (candle.sourceEventId.length === 0) {
    issues.push({
      reasonCode: 'DATA_INVALID_OHLCV',
      message: 'sourceEventId must be non-empty',
      path: 'sourceEventId',
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: candle };
}

export function validateInstrumentSpec(
  spec: EngineInstrumentSpec,
): ValidationResult<EngineInstrumentSpec> {
  const issues: ValidationIssue[] = [];

  const zero = parseDecimalString('0');

  if (!isFiniteDecimalString(spec.tickSize) || compare(spec.tickSize, zero) <= 0) {
    issues.push({
      reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
      message: 'tickSize must be > 0',
      path: 'tickSize',
    });
  }

  if (!(Number.isInteger(spec.lotSize) && spec.lotSize > 0)) {
    issues.push({
      reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
      message: 'lotSize must be a positive integer',
      path: 'lotSize',
    });
  }

  if (!isFiniteDecimalString(spec.pointValue) || compare(spec.pointValue, zero) <= 0) {
    issues.push({
      reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
      message: 'pointValue must be > 0',
      path: 'pointValue',
    });
  }

  if (!(spec.minQuantity > 0)) {
    issues.push({
      reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
      message: 'minQuantity must be > 0',
      path: 'minQuantity',
    });
  }

  if (!(spec.quantityStep > 0)) {
    issues.push({
      reasonCode: 'INSTRUMENT_SPEC_UNAVAILABLE',
      message: 'quantityStep must be > 0',
      path: 'quantityStep',
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: spec };
}

export function isClosedCandleEligibleForConfirmation(candle: EngineCandle): boolean {
  return candle.status === 'CLOSED' || candle.status === 'CORRECTED';
}
