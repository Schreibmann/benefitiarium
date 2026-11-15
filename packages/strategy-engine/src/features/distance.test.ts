import { parseDecimalString } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import {
  normalizedDistanceToLevel,
  normalizedDistanceToZone,
  roundProtectiveStop,
} from './distance.js';

describe('normalizedDistanceToLevel', () => {
  it('divides by max(ATR, tickSize)', () => {
    expect(normalizedDistanceToLevel('110', '100', '5', '1')).toBe('2');
    expect(normalizedDistanceToLevel('110', '100', '0.5', '2')).toBe('5');
  });
});

describe('normalizedDistanceToZone', () => {
  it('returns zero inside the zone', () => {
    expect(
      normalizedDistanceToZone(
        '105',
        { low: parseDecimalString('100'), high: parseDecimalString('110') },
        '5',
        '1',
      ),
    ).toBe('0');
  });

  it('uses nearest boundary outside the zone', () => {
    expect(
      normalizedDistanceToZone(
        '90',
        { low: parseDecimalString('100'), high: parseDecimalString('110') },
        '5',
        '1',
      ),
    ).toBe('2');
  });
});

describe('roundProtectiveStop', () => {
  it('rounds LONG stops down and SHORT stops up', () => {
    expect(roundProtectiveStop('100.37', '0.1', 'LONG')).toBe('100.3');
    expect(roundProtectiveStop('100.37', '0.1', 'SHORT')).toBe('100.4');
  });
});
