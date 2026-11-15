import { describe, expect, it } from 'vitest';
import { toVolumeProfileSegments } from './to-volume-profile-segments.js';
import type { HorizontalVolumeApiResponse } from './types.js';

const sample: HorizontalVolumeApiResponse = {
  instrumentUid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  chartTimeframe: '5m',
  levels: [
    { price: '100', volume: '10', buyVolume: '4', sellVolume: '6' },
    { price: '101', volume: '40', buyVolume: '25', sellVolume: '15' },
    { price: '102', volume: '20', buyVolume: '12', sellVolume: '8' },
  ],
  totalVolume: '70',
  volumeUnit: 'lots',
  poc: '101',
  vah: '102',
  val: '100',
  tickSize: '1',
  rowSizeInTicks: 1,
  rowSize: '1',
  valueAreaRatio: '0.70',
  sourceKind: 'last_trades',
  quality: 'ok',
  algorithm: { id: 'HORIZONTAL_VOLUME_TRADES', version: '1.1.0' },
  meta: {
    requestedFrom: '2026-11-05T00:00:00.000Z',
    requestedTo: '2026-11-06T00:00:00.000Z',
    effectiveFrom: '2026-11-05T00:00:00.000Z',
    effectiveTo: '2026-11-06T00:00:00.000Z',
    tradeCount: 3,
    historyTradeDays: ['2026-11-05'],
    missingDays: [],
    lastTradesIncluded: false,
    tradesSource: 'history_trades',
    calculatedAt: '2026-11-06T00:00:00.000Z',
  },
};

describe('toVolumeProfileSegments', () => {
  it('anchors histogram bars to the right edge and adds POC/VA guides', () => {
    const segments = toVolumeProfileSegments(sample, { start: 0, end: 100 });
    const bars = segments.filter((segment) => segment.kind === 'histogram');
    expect(bars).toHaveLength(3);
    expect(bars.every((bar) => bar.x2 === 100)).toBe(true);
    const pocBar = bars.find((bar) => bar.y1 === 101);
    expect(pocBar?.x1).toBe(82);
    expect(segments.some((segment) => segment.kind === 'poc' && segment.y1 === 101)).toBe(true);
    expect(segments.some((segment) => segment.kind === 'vah' && segment.y1 === 102)).toBe(true);
    expect(segments.some((segment) => segment.kind === 'val' && segment.y1 === 100)).toBe(true);
  });
});
