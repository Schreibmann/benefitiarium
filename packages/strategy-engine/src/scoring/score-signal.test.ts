import { describe, expect, it } from 'vitest';
import { type CategoryEvidenceInput, scoreSignal } from './score-signal.js';

function available(value: number): CategoryEvidenceInput {
  return { available: true, normalizedValue: value, rawValue: value };
}

function unavailable(): CategoryEvidenceInput {
  return {
    available: false,
    normalizedValue: null,
    rawValue: null,
    reasonCodes: ['REQUIRED_FEATURE_UNAVAILABLE'],
  };
}

describe('scoreSignal', () => {
  it('computes coverage-weighted scores and classifies STRONG', () => {
    const full = {
      marketRegime: available(1),
      fibonacci: available(0.8),
      volumeProfile: available(0.7),
      priceAction: available(1),
      volume: available(0.67),
      mtf: available(1),
    };
    const weak = {
      marketRegime: available(0),
      fibonacci: available(0.1),
      volumeProfile: available(0.1),
      priceAction: available(0),
      volume: available(0.2),
      mtf: available(0),
    };

    const result = scoreSignal({
      long: full,
      short: weak,
      configVersion: 'score-v1',
    });

    expect(result.longScore).toBeGreaterThan(80);
    expect(result.shortScore).toBeLessThan(40);
    expect(result.selectedDirection).toBe('LONG');
    expect(['CONFIRMED', 'STRONG']).toContain(result.classification);
    expect(result.longCoverage).toBe(1);
    expect(result.contributions.long).toHaveLength(6);
  });

  it('returns NOT_SCORABLE when required categories are missing', () => {
    const result = scoreSignal({
      long: {
        marketRegime: unavailable(),
        fibonacci: available(1),
        volumeProfile: available(1),
        priceAction: unavailable(),
        volume: available(1),
        mtf: available(1),
      },
      short: {
        marketRegime: unavailable(),
        fibonacci: available(0),
        volumeProfile: available(0),
        priceAction: unavailable(),
        volume: available(0),
        mtf: available(0),
      },
      configVersion: 'score-v1',
    });

    expect(result.classification).toBe('NOT_SCORABLE');
    expect(result.longScore).toBeNull();
    expect(result.reasonCodes).toContain('REQUIRED_FEATURE_UNAVAILABLE');
  });
});
