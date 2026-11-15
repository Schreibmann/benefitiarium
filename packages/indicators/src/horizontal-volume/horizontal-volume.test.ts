import { describe, expect, it } from 'vitest';
import { calculateHorizontalVolume } from './calculate.js';
import { HORIZONTAL_VOLUME_ALGORITHM_ID, HORIZONTAL_VOLUME_SOURCE_KIND } from './types.js';

describe('calculateHorizontalVolume', () => {
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
    expect(result.sourceKind).toBe(HORIZONTAL_VOLUME_SOURCE_KIND);
    expect(result.algorithmId).toBe(HORIZONTAL_VOLUME_ALGORITHM_ID);
    expect(result.totalVolume).toBe('70');
    expect(result.poc).toBe('101');

    const byPrice = Object.fromEntries(result.levels.map((level) => [level.price, level.volume]));
    // First candle: 30 / 3 = 10 on 100, 101, 102; second: 40 on 101 → 101 = 50
    expect(byPrice['100']).toBe('10');
    expect(byPrice['101']).toBe('50');
    expect(byPrice['102']).toBe('10');
  });

  it('computes value area covering the configured ratio around POC', () => {
    const result = calculateHorizontalVolume({
      candles: [
        { high: '100', low: '100', volume: '20' },
        { high: '101', low: '101', volume: '30' },
        { high: '102', low: '102', volume: '20' },
        { high: '103', low: '103', volume: '5' },
      ],
      tickSize: '1',
      valueAreaRatio: '0.70',
    });

    expect(result.poc).toBe('101');
    expect(result.val).toBe('100');
    expect(result.vah).toBe('102');
    // Expand POC→102 (tie prefers up) then →100: 30+20+20 = 70 ≥ 70% of 75
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

  it('marks single-level profiles as DEGENERATE', () => {
    const result = calculateHorizontalVolume({
      candles: [{ high: '42', low: '42', volume: '7' }],
      tickSize: '1',
    });
    expect(result.quality).toBe('DEGENERATE');
    expect(result.poc).toBe('42');
    expect(result.vah).toBe('42');
    expect(result.val).toBe('42');
  });

  it('rejects invalid OHLC and tick size', () => {
    expect(() =>
      calculateHorizontalVolume({
        candles: [{ high: '99', low: '100', volume: '1' }],
        tickSize: '1',
      }),
    ).toThrow(/high < low/);
    expect(() =>
      calculateHorizontalVolume({
        candles: [{ high: '100', low: '100', volume: '1' }],
        tickSize: '0',
      }),
    ).toThrow(/tickSize must be positive/);
  });

  it('auto-grows row size when the span would exceed the level cap', () => {
    const result = calculateHorizontalVolume({
      candles: [{ high: '10000', low: '0', volume: '100' }],
      tickSize: '1',
    });
    expect(result.rowSizeInTicks).toBeGreaterThan(1);
    expect(result.levels.length).toBeLessThanOrEqual(2000);
    expect(result.totalVolume).toBe('100');
  });
});
