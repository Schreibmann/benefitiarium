import { futurePadBars } from './chart-time.js';
import type { SessionCandleRow } from './session-scale.js';
import type { ChartTimeframe } from './types.js';

export type ChartXWindow = {
  start: number;
  end: number;
};

export type ChartTimeRange = {
  fromMs: number;
  toMs: number;
};

/** Packed session axis bounds: candles stop at candleEnd; timeline continues to contentEnd. */
export type ChartXExtent = {
  start: number;
  candleEnd: number;
  contentEnd: number;
};

const DEFAULT_SCALE_EXTENT: readonly [number, number] = [1, 64];

export function sessionXExtent(
  candles: readonly SessionCandleRow[],
  timeframe: ChartTimeframe,
): ChartXExtent {
  if (candles.length === 0) {
    return { start: -0.5, candleEnd: 0.5, contentEnd: 0.5 };
  }
  const candleEnd = candles.length - 1;
  const pad = futurePadBars(candles, timeframe);
  return {
    start: 0,
    candleEnd,
    contentEnd: candleEnd + pad,
  };
}

/**
 * Default view window through mid-next-day padding.
 * Pass a finite `visibleBars` to crop to the latest window ending at contentEnd.
 */
export function defaultSessionXWindow(
  extent: ChartXExtent,
  visibleBars: number = Number.POSITIVE_INFINITY,
): ChartXWindow {
  const span = extent.contentEnd - extent.start;
  if (!Number.isFinite(visibleBars) || span <= visibleBars) {
    return { start: extent.start, end: extent.contentEnd };
  }
  return { start: extent.contentEnd - visibleBars, end: extent.contentEnd };
}

export function clampXWindow(
  window: ChartXWindow,
  extent: ChartXExtent,
  scaleExtent: readonly [number, number] = DEFAULT_SCALE_EXTENT,
): ChartXWindow {
  // Zoom limits follow the candle series; contentEnd only extends the right pad.
  const candleSpan = Math.max(extent.candleEnd - extent.start, 1e-9);
  const contentSpan = Math.max(extent.contentEnd - extent.start, 1e-9);
  const minSpan = candleSpan / scaleExtent[1];
  const maxSpan = contentSpan / scaleExtent[0];

  let start = Math.min(window.start, window.end);
  let end = Math.max(window.start, window.end);
  let span = Math.max(end - start, minSpan);

  if (span > maxSpan) {
    span = maxSpan;
  }
  if (span < minSpan) {
    span = minSpan;
  }

  const mid = (start + end) / 2;
  start = mid - span / 2;
  end = mid + span / 2;

  // Left edge: do not scroll past the first candle.
  if (start < extent.start) {
    start = extent.start;
    end = start + span;
  }

  // Right pan: last candle may leave the right edge into the future pad, but
  // the last candle itself must stay on-screen (cannot pass the left edge).
  if (start > extent.candleEnd) {
    start = extent.candleEnd;
    end = start + span;
  }

  return { start, end };
}

/** Zoom around an anchor in [0, 1] within the current window (0 = left, 1 = right). */
export function zoomXWindowAt(
  window: ChartXWindow,
  extent: ChartXExtent,
  factor: number,
  anchorRatio: number,
): ChartXWindow {
  const start = Math.min(window.start, window.end);
  const end = Math.max(window.start, window.end);
  const span = Math.max(end - start, 1e-9);
  const ratio = Math.min(1, Math.max(0, anchorRatio));
  const focus = start + span * ratio;
  const nextSpan = span * factor;
  return clampXWindow(
    {
      start: focus - nextSpan * ratio,
      end: focus + nextSpan * (1 - ratio),
    },
    extent,
  );
}

export function panXWindow(
  window: ChartXWindow,
  extent: ChartXExtent,
  delta: number,
): ChartXWindow {
  return clampXWindow(
    {
      start: window.start + delta,
      end: window.end + delta,
    },
    extent,
  );
}

/** Capture the visible wall-clock range so pan/zoom can survive timeframe reloads. */
export function timeRangeFromXWindow(
  candles: readonly SessionCandleRow[],
  window: ChartXWindow,
): ChartTimeRange | null {
  if (candles.length === 0) {
    return null;
  }
  const start = Math.min(window.start, window.end);
  const end = Math.max(window.start, window.end);
  let fromMs: number | null = null;
  let toMs: number | null = null;
  for (const candle of candles) {
    if (candle.index >= start && candle.index <= end) {
      const t = candle.Date.getTime();
      if (fromMs === null || t < fromMs) {
        fromMs = t;
      }
      if (toMs === null || t > toMs) {
        toMs = t;
      }
    }
  }
  if (fromMs === null || toMs === null) {
    return null;
  }
  return { fromMs, toMs };
}

/** Remap a saved wall-clock range onto the new session index axis. */
export function xWindowFromTimeRange(
  candles: readonly SessionCandleRow[],
  range: ChartTimeRange,
  timeframe: ChartTimeframe,
): ChartXWindow | null {
  if (candles.length === 0) {
    return null;
  }
  let start: number | null = null;
  let end: number | null = null;
  for (const candle of candles) {
    const t = candle.Date.getTime();
    if (t >= range.fromMs && t <= range.toMs) {
      if (start === null || candle.index < start) {
        start = candle.index;
      }
      if (end === null || candle.index > end) {
        end = candle.index;
      }
    }
  }
  if (start === null || end === null) {
    return null;
  }
  return clampXWindow({ start, end }, sessionXExtent(candles, timeframe));
}
