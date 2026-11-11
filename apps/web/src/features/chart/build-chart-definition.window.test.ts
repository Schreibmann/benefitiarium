import { describe, expect, it } from 'vitest';
import { formatSessionTick } from './build-chart-definition.js';
import { futurePadBars, midOfNextLocalDay, pivotLineDurationMs } from './chart-time.js';
import {
  defaultSessionXWindow,
  panXWindow,
  sessionXExtent,
  timeRangeFromXWindow,
  xWindowFromTimeRange,
  zoomXWindowAt,
} from './chart-viewport.js';
import type { SessionCandleRow } from './session-scale.js';

function candle(index: number, date: Date): SessionCandleRow {
  return {
    index,
    Date: date,
    Open: 1,
    High: 1,
    Low: 1,
    Close: 1,
    Volume: 1,
    isClosed: true,
  };
}

describe('session x window helpers', () => {
  it('extends content past the last candle through mid next day', () => {
    const candles = [
      candle(0, new Date(2026, 10, 10, 10, 0, 0)),
      candle(1, new Date(2026, 10, 10, 10, 5, 0)),
      candle(2, new Date(2026, 10, 10, 18, 0, 0)),
    ];
    const extent = sessionXExtent(candles, '5m');
    expect(extent.start).toBe(0);
    expect(extent.candleEnd).toBe(2);
    expect(extent.contentEnd).toBeGreaterThan(extent.candleEnd);
    expect(defaultSessionXWindow(extent)).toEqual({
      start: 0,
      end: extent.contentEnd,
    });
  });

  it('can still crop to the latest visibleBars window ending at contentEnd', () => {
    const candles = Array.from({ length: 200 }, (_, index) =>
      candle(index, new Date(2026, 10, 1, 0, index * 5, 0)),
    );
    const extent = sessionXExtent(candles, '5m');
    const window = defaultSessionXWindow(extent, 120);
    expect(window.end).toBe(extent.contentEnd);
    expect(window.end - window.start).toBeCloseTo(120);
  });

  it('clamps zoom and left pan, but allows right overscroll into the future pad', () => {
    const candles = Array.from({ length: 100 }, (_, index) =>
      candle(index, new Date(2026, 10, 10, 0, index, 0)),
    );
    const extent = sessionXExtent(candles, '1m');
    const zoomed = zoomXWindowAt({ start: 0, end: 99 }, extent, 0.5, 1);
    expect(zoomed.start).toBeGreaterThanOrEqual(0);
    expect(zoomed.end - zoomed.start).toBeLessThan(99);

    const pannedPastLast = panXWindow({ start: 50, end: 80 }, extent, 40);
    expect(pannedPastLast.start).toBeCloseTo(90);
    expect(pannedPastLast.end).toBeGreaterThan(extent.candleEnd);

    const maxRight = panXWindow({ start: 90, end: 120 }, extent, 1000);
    expect(maxRight.start).toBe(extent.candleEnd);
  });
});

describe('future pad and pivot span', () => {
  it('counts bars through local noon of the next day', () => {
    const last = candle(0, new Date(2026, 10, 10, 18, 0, 0));
    const pad = futurePadBars([last], '1h');
    const expectedMs = midOfNextLocalDay(last.Date).getTime() - last.Date.getTime();
    expect(pad).toBe(Math.ceil(expectedMs / 3_600_000));
  });

  it('uses 1 day lines for 1m/5m and 7 days for 1h', () => {
    expect(pivotLineDurationMs('1m')).toBe(24 * 60 * 60 * 1000);
    expect(pivotLineDurationMs('5m')).toBe(24 * 60 * 60 * 1000);
    expect(pivotLineDurationMs('1h')).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('time-range viewport remapping', () => {
  it('round-trips a visible window through wall-clock time', () => {
    const candles: SessionCandleRow[] = [
      candle(0, new Date('2026-11-10T10:00:00.000Z')),
      candle(1, new Date('2026-11-10T10:05:00.000Z')),
      candle(2, new Date('2026-11-10T10:10:00.000Z')),
    ];
    const range = timeRangeFromXWindow(candles, { start: 1, end: 2 });
    expect(range).toEqual({
      fromMs: new Date('2026-11-10T10:05:00.000Z').getTime(),
      toMs: new Date('2026-11-10T10:10:00.000Z').getTime(),
    });
    expect(xWindowFromTimeRange(candles, range ?? { fromMs: 0, toMs: 0 }, '5m')).toEqual({
      start: 1,
      end: 2,
    });
  });
});

describe('formatSessionTick', () => {
  it('formats candle time as HH:mm and extrapolates into the future pad', () => {
    const candles: SessionCandleRow[] = [
      candle(0, new Date(2026, 10, 10, 9, 5, 0)),
      candle(1, new Date(2026, 10, 10, 14, 30, 0)),
    ];
    expect(formatSessionTick(candles, 0, '5m')).toBe('09:05');
    expect(formatSessionTick(candles, 1, '5m')).toBe('14:30');
    expect(formatSessionTick(candles, 2, '5m')).toBe('14:35');
  });
});
