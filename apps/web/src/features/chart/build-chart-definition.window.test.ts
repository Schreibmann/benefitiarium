import { describe, expect, it } from 'vitest';
import { defaultSessionXWindow, sessionXExtent } from './build-chart-definition.js';
import type { SessionCandleRow } from './session-scale.js';

function candle(index: number): SessionCandleRow {
  return {
    index,
    Date: new Date(Date.UTC(2026, 10, 9, 10, index)),
    Open: 1,
    High: 2,
    Low: 0.5,
    Close: 1.5,
    Volume: 1,
    isClosed: true,
  };
}

describe('session x window helpers', () => {
  it('uses full extent when series is shorter than default visible bars', () => {
    const candles = [candle(0), candle(1), candle(2)];
    expect(sessionXExtent(candles)).toEqual([0, 2]);
    expect(defaultSessionXWindow(candles, 120)).toEqual({ start: 0, end: 2 });
  });

  it('defaults to the latest visibleBars window', () => {
    const candles = Array.from({ length: 200 }, (_item, index) => candle(index));
    expect(defaultSessionXWindow(candles, 120)).toEqual({ start: 79, end: 199 });
  });
});
