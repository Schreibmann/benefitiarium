import { parseDecimalString } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { AnalyzedPriceLevel } from '../analyzers/fibonacci-levels.js';
import {
  buildEntryReferences,
  computeStructuralStop,
  selectTakeProfitCandidates,
} from './entry-stop-target.js';

describe('computeStructuralStop', () => {
  it('places LONG stop below invalidation with buffer and rounds down', () => {
    const result = computeStructuralStop({
      direction: 'LONG',
      invalidationLevel: '100',
      invalidationSource: 'HL',
      atr: '10',
      tickSize: '0.1',
    });
    // buffer = max(0.2, 1.5) = 1.5 → raw 98.5 → roundDown tick 0.1 = 98.5
    expect(result.stop).toBe('98.5');
    expect(result.invalidationSource).toBe('HL');
  });
});

describe('selectTakeProfitCandidates', () => {
  it('keeps on-side structural targets that meet min RR', () => {
    const levels: AnalyzedPriceLevel[] = [
      {
        id: 'R1',
        source: 'FIB_PIVOT',
        sourceId: 'R1',
        price: parseDecimalString('110'),
        zoneLow: parseDecimalString('109'),
        zoneHigh: parseDecimalString('111'),
        distanceAtr: parseDecimalString('1'),
        contextualRole: 'RESISTANCE_CANDIDATE',
        isConfirmed: true,
      },
      {
        id: 'S1',
        source: 'FIB_PIVOT',
        sourceId: 'S1',
        price: parseDecimalString('90'),
        zoneLow: parseDecimalString('89'),
        zoneHigh: parseDecimalString('91'),
        distanceAtr: parseDecimalString('1'),
        contextualRole: 'SUPPORT_CANDIDATE',
        isConfirmed: true,
      },
    ];

    const selection = selectTakeProfitCandidates({
      direction: 'LONG',
      entry: '100',
      stop: '95',
      atr: '5',
      pointValue: '1',
      costPerUnit: '0',
      structuralLevels: levels,
    });

    expect(selection.selected.length).toBeGreaterThan(0);
    expect(selection.selected[0]?.source).toBe('FIB_PIVOT');
    expect(selection.candidates.find((item) => item.id === 'S1')?.accepted).toBe(false);
  });
});

describe('buildEntryReferences', () => {
  it('keeps signal and execution references distinct', () => {
    const refs = buildEntryReferences({
      confirmationClose: '100',
      signalTimestamp: 1,
      executionReferencePrice: '100.2',
    });
    expect(refs.signalReferencePrice).toBe('100');
    expect(refs.executionReferencePrice).toBe('100.2');
  });
});
