import { describe, expect, it } from 'vitest';
import { formatSessionTick } from './build-chart-definition.js';
import {
  clampXWindow,
  defaultSessionXWindow,
  panXWindow,
  sessionXExtent,
  timeRangeFromXWindow,
  xWindowFromTimeRange,
  zoomXWindowAt,
} from './chart-viewport.js';
import type { SessionCandleRow } from './session-scale.js';

describe('session x window helpers', () => {
  it('uses full extent when series is shorter than default visible bars', () => {
    expect(sessionXExtent(3)).toEqual([0, 2]);
    expect(defaultSessionXWindow(3, 120)).toEqual({ start: 0, end: 2 });
  });

  it('defaults to the full series when no finite visibleBars cap is set', () => {
    expect(defaultSessionXWindow(200)).toEqual({ start: 0, end: 199 });
    expect(defaultSessionXWindow(200, Number.POSITIVE_INFINITY)).toEqual({ start: 0, end: 199 });
  });

  it('can still crop to the latest visibleBars window', () => {
    expect(defaultSessionXWindow(200, 120)).toEqual({ start: 79, end: 199 });
  });

  it('clamps zoom and left pan, but allows right overscroll past the last candle', () => {
    const extent = sessionXExtent(100);
    const zoomed = zoomXWindowAt({ start: 0, end: 99 }, extent, 0.5, 1);
    expect(zoomed.start).toBeGreaterThanOrEqual(0);
    expect(zoomed.end - zoomed.start).toBeLessThan(99);

    const pannedPastLast = panXWindow({ start: 50, end: 80 }, extent, 40);
    expect(pannedPastLast.start).toBeCloseTo(90);
    expect(pannedPastLast.end).toBeCloseTo(120);
    expect(pannedPastLast.end).toBeGreaterThan(extent[1]);

    const maxRight = panXWindow({ start: 90, end: 120 }, extent, 1000);
    expect(maxRight.start).toBe(extent[1]);
    expect(maxRight.end - maxRight.start).toBeCloseTo(30);

    const oversized = clampXWindow({ start: -10, end: 200 }, extent);
    expect(oversized.end - oversized.start).toBeCloseTo(99);
    expect(oversized.start).toBeGreaterThanOrEqual(0);
    expect(oversized.start).toBeLessThanOrEqual(extent[1]);
  });
});

describe('time-range viewport remapping', () => {
  it('round-trips a visible window through wall-clock time', () => {
    const candles: SessionCandleRow[] = [
      {
        index: 0,
        Date: new Date('2026-11-10T10:00:00.000Z'),
        Open: 1,
        High: 1,
        Low: 1,
        Close: 1,
        Volume: 1,
        isClosed: true,
      },
      {
        index: 1,
        Date: new Date('2026-11-10T10:05:00.000Z'),
        Open: 1,
        High: 1,
        Low: 1,
        Close: 1,
        Volume: 1,
        isClosed: true,
      },
      {
        index: 2,
        Date: new Date('2026-11-10T10:10:00.000Z'),
        Open: 1,
        High: 1,
        Low: 1,
        Close: 1,
        Volume: 1,
        isClosed: true,
      },
    ];
    const range = timeRangeFromXWindow(candles, { start: 1, end: 2 });
    expect(range).toEqual({
      fromMs: new Date('2026-11-10T10:05:00.000Z').getTime(),
      toMs: new Date('2026-11-10T10:10:00.000Z').getTime(),
    });
    expect(xWindowFromTimeRange(candles, range ?? { fromMs: 0, toMs: 0 })).toEqual({
      start: 1,
      end: 2,
    });
  });
});

describe('formatSessionTick', () => {
  it('formats candle time as HH:mm in local time', () => {
    const candles: SessionCandleRow[] = [
      {
        index: 0,
        Date: new Date(2026, 10, 10, 9, 5, 0),
        Open: 1,
        High: 1,
        Low: 1,
        Close: 1,
        Volume: 1,
        isClosed: true,
      },
      {
        index: 1,
        Date: new Date(2026, 10, 10, 14, 30, 0),
        Open: 1,
        High: 1,
        Low: 1,
        Close: 1,
        Volume: 1,
        isClosed: true,
      },
    ];
    expect(formatSessionTick(candles, 0)).toBe('09:05');
    expect(formatSessionTick(candles, 1)).toBe('14:30');
    expect(formatSessionTick(candles, 2)).toBe('');
  });
});
