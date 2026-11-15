import {
  type InstrumentSpec,
  parseDecimalString,
  parseInstrumentId,
  parseIsoDateTime,
} from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { mapDomainInstrumentSpec } from './instrument-spec.js';

const instrumentId = parseInstrumentId('33333333-3333-4333-8333-333333333333');

function baseSpec(overrides: Partial<InstrumentSpec> = {}): InstrumentSpec {
  return {
    instrumentId,
    validFrom: parseIsoDateTime('2026-01-01T00:00:00.000Z'),
    validTo: null,
    lotSize: 1,
    minPriceIncrement: parseDecimalString('0.01'),
    priceCurrency: 'RUB',
    priceType: 'currency',
    contractMultiplier: null,
    expirationAt: null,
    marginInitial: null,
    raw: {},
    ...overrides,
  };
}

describe('mapDomainInstrumentSpec', () => {
  it('maps futures point value from minPriceIncrementAmount', () => {
    const result = mapDomainInstrumentSpec(
      baseSpec({
        priceType: 'points',
        minPriceIncrementAmount: parseDecimalString('1.25'),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.tickSize).toBe('0.01');
    expect(result.value.pointValue).toBe('1.25');
    expect(result.value.lotSize).toBe(1);
  });

  it('returns INSTRUMENT_SPEC_UNAVAILABLE when point value is missing', () => {
    const result = mapDomainInstrumentSpec(baseSpec());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCodes).toContain('INSTRUMENT_SPEC_UNAVAILABLE');
    }
  });

  it('accepts pointValueOverride when domain amount is absent', () => {
    const result = mapDomainInstrumentSpec(baseSpec(), { pointValueOverride: '1' });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.pointValue).toBe('1');
  });
});
