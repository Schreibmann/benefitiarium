import { add, subtract } from '@moex/decimal';
import { parseDecimalString } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { AnalyzedPriceLevel } from '../analyzers/fibonacci-levels.js';
import { clusterPriceLevels, levelsFromVolumeProfile } from './confluence.js';

function level(
  id: string,
  source: AnalyzedPriceLevel['source'],
  price: string,
  zonePad = '1',
): AnalyzedPriceLevel {
  const p = parseDecimalString(price);
  const pad = parseDecimalString(zonePad);
  return {
    id,
    source,
    sourceId: id,
    price: p,
    zoneLow: subtract(p, pad),
    zoneHigh: add(p, pad),
    distanceAtr: parseDecimalString('0.2'),
    contextualRole: 'NEUTRAL',
    isConfirmed: true,
  };
}

describe('clusterPriceLevels', () => {
  it('merges nearby levels across families and scores strength', () => {
    const zones = clusterPriceLevels(
      [
        level('P', 'FIB_PIVOT', '100'),
        level('POC', 'VOLUME_PROFILE', '100.5'),
        level('far', 'SWING', '120'),
      ],
      '5',
      '0.1',
      1,
    );

    expect(zones.length).toBe(2);
    const near = zones.find((zone) => zone.members.some((member) => member.sourceId === 'P'));
    expect(near?.familyCount).toBeGreaterThanOrEqual(2);
    expect(near?.overallStrength).toBeGreaterThan(0);
    expect(near?.overallStrength).toBeLessThanOrEqual(1);
  });
});

describe('levelsFromVolumeProfile', () => {
  it('maps POC/VAH/VAL into analyzed levels', () => {
    const levels = levelsFromVolumeProfile({
      poc: parseDecimalString('101'),
      vah: parseDecimalString('105'),
      val: parseDecimalString('97'),
      atr: '5',
      tickSize: '0.01',
      referencePrice: '100',
      profileId: 'vp-1',
    });
    expect(levels).toHaveLength(3);
    expect(levels.every((item) => item.source === 'VOLUME_PROFILE')).toBe(true);
  });
});
