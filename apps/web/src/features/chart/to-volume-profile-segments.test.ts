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
  totalBuyVolume: '41',
  totalSellVolume: '29',
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
  algorithm: { id: 'HORIZONTAL_VOLUME_TRADES', version: '1.2.0' },
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
  it('builds right-anchored buy/sell rects with row height and POC guide', () => {
    const segments = toVolumeProfileSegments(sample, { start: 0, end: 100 });
    const sells = segments.filter((segment) => segment.kind === 'sell');
    const buys = segments.filter((segment) => segment.kind === 'buy');
    expect(sells.length).toBe(3);
    expect(buys.length).toBe(3);

    const pocSell = sells.find((bar) => bar.y1 === 100.5 && bar.y2 === 101.5);
    const pocBuy = buys.find((bar) => bar.y1 === 100.5 && bar.y2 === 101.5);
    expect(pocSell?.x2).toBe(pocBuy?.x1);
    expect(pocBuy?.x2).toBe(100);
    // max volume 40 → full width 20; buy 25/40 of that = 12.5
    expect(pocBuy?.x1).toBe(87.5);
    expect(pocSell?.x1).toBe(80);

    expect(segments.some((segment) => segment.kind === 'poc' && segment.y1 === 101)).toBe(true);
    expect(segments.some((segment) => segment.kind === 'vah' && segment.y1 === 102)).toBe(true);
    expect(segments.some((segment) => segment.kind === 'val' && segment.y1 === 100)).toBe(true);
    expect(pocBuy?.inValueArea).toBe(true);
  });
});
