import type { InstrumentSpec } from '@moex/domain';
import { parseDecimalString, parseInstrumentId, parseIsoDateTime } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import {
  appendInstrumentSpecVersion,
  assertNoOverlap,
  hasMaterialSpecChange,
  selectInstrumentSpecAt,
} from './spec-versioning.js';

const instrumentId = parseInstrumentId('11111111-1111-4111-8111-111111111111');

function spec(input: {
  validFrom: string;
  validTo: string | null;
  lotSize: number;
  minPriceIncrement?: string;
  contractMultiplier?: string | null;
  expirationAt?: string | null;
}): InstrumentSpec {
  return {
    instrumentId,
    validFrom: parseIsoDateTime(input.validFrom),
    validTo: input.validTo === null ? null : parseIsoDateTime(input.validTo),
    lotSize: input.lotSize,
    minPriceIncrement: parseDecimalString(input.minPriceIncrement ?? '0.01'),
    priceCurrency: 'RUB',
    priceType: 'currency',
    contractMultiplier:
      input.contractMultiplier === undefined
        ? null
        : input.contractMultiplier === null
          ? null
          : parseDecimalString(input.contractMultiplier),
    expirationAt:
      input.expirationAt === undefined || input.expirationAt === null
        ? null
        : parseIsoDateTime(input.expirationAt),
    marginInitial: null,
    raw: {},
  };
}

describe('selectInstrumentSpecAt', () => {
  const history = [
    spec({
      validFrom: '2024-01-01T00:00:00.000Z',
      validTo: '2025-01-01T00:00:00.000Z',
      lotSize: 10,
    }),
    spec({
      validFrom: '2025-01-01T00:00:00.000Z',
      validTo: null,
      lotSize: 1,
    }),
  ];

  it('returns older version before the boundary', () => {
    const selected = selectInstrumentSpecAt(
      history,
      instrumentId,
      parseIsoDateTime('2024-12-31T23:59:59.000Z'),
    );
    expect(selected?.lotSize).toBe(10);
  });

  it('switches at validTo boundary (half-open)', () => {
    const selected = selectInstrumentSpecAt(
      history,
      instrumentId,
      parseIsoDateTime('2025-01-01T00:00:00.000Z'),
    );
    expect(selected?.lotSize).toBe(1);
  });

  it('returns null when asOf is before any version', () => {
    expect(
      selectInstrumentSpecAt(history, instrumentId, parseIsoDateTime('2023-01-01T00:00:00.000Z')),
    ).toBeNull();
  });
});

describe('appendInstrumentSpecVersion', () => {
  it('creates a new row and closes the previous open version on lot change', () => {
    const initial = spec({
      validFrom: '2024-01-01T00:00:00.000Z',
      validTo: null,
      lotSize: 10,
    });
    const next = spec({
      validFrom: '2025-06-01T00:00:00.000Z',
      validTo: null,
      lotSize: 1,
    });

    const result = appendInstrumentSpecVersion([initial], next);
    expect(result.changed).toBe(true);
    if (!result.changed) {
      throw new Error('expected change');
    }
    expect(result.previous.validTo).toBe('2025-06-01T00:00:00.000Z');
    expect(result.current.lotSize).toBe(1);
    expect(result.specs).toHaveLength(2);

    const atBoundary = selectInstrumentSpecAt(
      result.specs,
      instrumentId,
      parseIsoDateTime('2025-06-01T00:00:00.000Z'),
    );
    expect(atBoundary?.lotSize).toBe(1);
    const justBefore = selectInstrumentSpecAt(
      result.specs,
      instrumentId,
      parseIsoDateTime('2025-05-31T23:59:59.000Z'),
    );
    expect(justBefore?.lotSize).toBe(10);
  });

  it('does not append when material fields are unchanged', () => {
    const initial = spec({
      validFrom: '2024-01-01T00:00:00.000Z',
      validTo: null,
      lotSize: 10,
      minPriceIncrement: '0.01',
    });
    const same = spec({
      validFrom: '2025-01-01T00:00:00.000Z',
      validTo: null,
      lotSize: 10,
      minPriceIncrement: '0.01',
    });
    const result = appendInstrumentSpecVersion([initial], same);
    expect(result.changed).toBe(false);
    expect(result.specs).toHaveLength(1);
  });

  it('treats tick / multiplier / expiry changes as material', () => {
    const base = spec({
      validFrom: '2024-01-01T00:00:00.000Z',
      validTo: null,
      lotSize: 1,
      minPriceIncrement: '0.01',
      contractMultiplier: '10',
      expirationAt: '2026-03-19T00:00:00.000Z',
    });
    expect(
      hasMaterialSpecChange(
        base,
        spec({
          validFrom: '2025-01-01T00:00:00.000Z',
          validTo: null,
          lotSize: 1,
          minPriceIncrement: '0.05',
          contractMultiplier: '10',
          expirationAt: '2026-03-19T00:00:00.000Z',
        }),
      ),
    ).toBe(true);
    expect(
      hasMaterialSpecChange(
        base,
        spec({
          validFrom: '2025-01-01T00:00:00.000Z',
          validTo: null,
          lotSize: 1,
          minPriceIncrement: '0.01',
          contractMultiplier: '100',
          expirationAt: '2026-03-19T00:00:00.000Z',
        }),
      ),
    ).toBe(true);
    expect(
      hasMaterialSpecChange(
        base,
        spec({
          validFrom: '2025-01-01T00:00:00.000Z',
          validTo: null,
          lotSize: 1,
          minPriceIncrement: '0.01',
          contractMultiplier: '10',
          expirationAt: '2026-06-19T00:00:00.000Z',
        }),
      ),
    ).toBe(true);
  });

  it('rejects overlapping intervals', () => {
    expect(() =>
      assertNoOverlap([
        spec({
          validFrom: '2024-01-01T00:00:00.000Z',
          validTo: '2025-06-01T00:00:00.000Z',
          lotSize: 10,
        }),
        spec({
          validFrom: '2025-01-01T00:00:00.000Z',
          validTo: null,
          lotSize: 1,
        }),
      ]),
    ).toThrow(/Overlapping/);
  });
});
