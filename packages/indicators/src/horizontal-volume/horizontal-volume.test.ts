import { describe, expect, it } from 'vitest';
import { calculateHorizontalVolume, calculateHorizontalVolumeFromTrades } from './calculate.js';
import {
  HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID,
  HORIZONTAL_VOLUME_SOURCE_KIND,
  HORIZONTAL_VOLUME_TRADES_ALGORITHM_ID,
} from './types.js';

describe('calculateHorizontalVolume (OHLCV approx)', () => {
  it('distributes bar volume uniformly across tick rows and finds POC', () => {
    const result = calculateHorizontalVolume({
      candles: [
        { high: '102', low: '100', volume: '30' },
        { high: '101', low: '101', volume: '40' },
      ],
      tickSize: '1',
      rowSizeInTicks: 1,
    });

    expect(result.quality).toBe('ok');
    expect(result.sourceKind).toBe(HORIZONTAL_VOLUME_SOURCE_KIND.ohlcvUniformApproximation);
    expect(result.algorithmId).toBe(HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID);
    expect(result.totalVolume).toBe('70');
    expect(result.poc).toBe('101');

    const byPrice = Object.fromEntries(result.levels.map((level) => [level.price, level.volume]));
    expect(byPrice['100']).toBe('10');
    expect(byPrice['101']).toBe('50');
    expect(byPrice['102']).toBe('10');
  });

  it('returns EMPTY when all volumes are zero', () => {
    const result = calculateHorizontalVolume({
      candles: [{ high: '101', low: '100', volume: '0' }],
      tickSize: '0.01',
    });
    expect(result.quality).toBe('EMPTY');
    expect(result.levels).toEqual([]);
    expect(result.poc).toBeNull();
  });
});

describe('calculateHorizontalVolumeFromTrades', () => {
  it('aggregates lots at trade prices with buy/sell split and POC', () => {
    const result = calculateHorizontalVolumeFromTrades({
      trades: [
        { price: '100', quantity: '10', direction: 'buy' },
        { price: '101', quantity: '40', direction: 'sell' },
        { price: '101', quantity: '10', direction: 'buy' },
        { price: '102', quantity: '20', direction: 'sell' },
      ],
      tickSize: '1',
    });

    expect(result.sourceKind).toBe(HORIZONTAL_VOLUME_SOURCE_KIND.lastTrades);
    expect(result.algorithmId).toBe(HORIZONTAL_VOLUME_TRADES_ALGORITHM_ID);
    expect(result.totalVolume).toBe('80');
    expect(result.poc).toBe('101');

    const level101 = result.levels.find((level) => level.price === '101');
    expect(level101?.volume).toBe('50');
    expect(level101?.buyVolume).toBe('10');
    expect(level101?.sellVolume).toBe('40');
  });

  it('computes value area covering the configured ratio around POC', () => {
    const result = calculateHorizontalVolumeFromTrades({
      trades: [
        { price: '100', quantity: '20', direction: 'buy' },
        { price: '101', quantity: '30', direction: 'buy' },
        { price: '102', quantity: '20', direction: 'sell' },
        { price: '103', quantity: '5', direction: 'sell' },
      ],
      tickSize: '1',
      valueAreaRatio: '0.70',
    });

    expect(result.poc).toBe('101');
    expect(result.val).toBe('100');
    expect(result.vah).toBe('102');
  });

  it('marks single-level profiles as DEGENERATE', () => {
    const result = calculateHorizontalVolumeFromTrades({
      trades: [{ price: '42', quantity: '7', direction: 'buy' }],
      tickSize: '1',
    });
    expect(result.quality).toBe('DEGENERATE');
    expect(result.poc).toBe('42');
  });

  it('rejects negative quantity and non-positive tick', () => {
    expect(() =>
      calculateHorizontalVolumeFromTrades({
        trades: [{ price: '1', quantity: '-1' }],
        tickSize: '1',
      }),
    ).toThrow(/quantity < 0/);
    expect(() =>
      calculateHorizontalVolumeFromTrades({
        trades: [{ price: '1', quantity: '1' }],
        tickSize: '0',
      }),
    ).toThrow(/tickSize must be positive/);
  });
});
