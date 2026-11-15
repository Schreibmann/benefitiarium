import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { EngineCandle, EngineInstrumentSpec } from './types.js';
import {
  isClosedCandleEligibleForConfirmation,
  validateInstrumentSpec,
  validateOhlcv,
} from './validate.js';

const instrumentId = parseInstrumentId('11111111-1111-4111-8111-111111111111');

function closedCandle(overrides: Partial<EngineCandle> = {}): EngineCandle {
  return {
    instrumentId,
    timeframe: '5m',
    timestamp: Date.parse('2026-11-14T10:00:00.000Z'),
    closeTimestamp: Date.parse('2026-11-14T10:05:00.000Z'),
    open: parseDecimalString('100'),
    high: parseDecimalString('110'),
    low: parseDecimalString('95'),
    close: parseDecimalString('105'),
    volume: parseDecimalString('10'),
    status: 'CLOSED',
    revision: 1,
    sourceEventId: 'evt-1',
    ...overrides,
  };
}

describe('validateOhlcv', () => {
  it('accepts a valid closed candle', () => {
    const result = validateOhlcv(closedCandle());
    expect(result.ok).toBe(true);
  });

  it('rejects high below max(open, close)', () => {
    const result = validateOhlcv(
      closedCandle({
        open: parseDecimalString('100'),
        close: parseDecimalString('105'),
        high: parseDecimalString('104'),
        low: parseDecimalString('95'),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.reasonCode === 'DATA_INVALID_OHLCV')).toBe(true);
    }
  });

  it('rejects non-positive closeTimestamp delta', () => {
    const result = validateOhlcv(
      closedCandle({
        timestamp: 1000,
        closeTimestamp: 1000,
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe('validateInstrumentSpec', () => {
  const valid: EngineInstrumentSpec = {
    instrumentId,
    exchange: 'MOEX',
    tickSize: parseDecimalString('0.01'),
    lotSize: 1,
    pointValue: parseDecimalString('1'),
    minQuantity: 1,
    quantityStep: 1,
    quoteCurrency: 'RUB',
    priceCurrency: 'RUB',
    tradingCalendarId: null,
    sessionProfile: 'SESSION_BASED',
  };

  it('accepts a valid engine instrument spec', () => {
    expect(validateInstrumentSpec(valid).ok).toBe(true);
  });

  it('rejects non-positive tickSize', () => {
    const result = validateInstrumentSpec({
      ...valid,
      tickSize: parseDecimalString('0'),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.reasonCode).toBe('INSTRUMENT_SPEC_UNAVAILABLE');
    }
  });
});

describe('isClosedCandleEligibleForConfirmation', () => {
  it('allows CLOSED and CORRECTED only', () => {
    expect(isClosedCandleEligibleForConfirmation(closedCandle({ status: 'OPEN' }))).toBe(false);
    expect(isClosedCandleEligibleForConfirmation(closedCandle({ status: 'CLOSED' }))).toBe(true);
    expect(isClosedCandleEligibleForConfirmation(closedCandle({ status: 'CORRECTED' }))).toBe(true);
  });
});
