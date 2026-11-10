import type { SessionCandleRow } from './session-scale.js';

export type ChartXWindow = {
  start: number;
  end: number;
};

export type ChartTimeRange = {
  fromMs: number;
  toMs: number;
};

const DEFAULT_SCALE_EXTENT: readonly [number, number] = [1, 64];

export function sessionXExtent(candlesLength: number): readonly [number, number] {
  if (candlesLength > 1) {
    return [0, candlesLength - 1];
  }
  return [-0.5, 0.5];
}

/**
 * Default view window.
 * Pass `Number.POSITIVE_INFINITY` (or omit a finite cap) to show the full series.
 */
export function defaultSessionXWindow(
  candlesLength: number,
  visibleBars: number = Number.POSITIVE_INFINITY,
): ChartXWindow {
  const extent = sessionXExtent(candlesLength);
  const span = extent[1] - extent[0];
  if (!Number.isFinite(visibleBars) || span <= visibleBars) {
    return { start: extent[0], end: extent[1] };
  }
  return { start: extent[1] - visibleBars, end: extent[1] };
}

export function clampXWindow(
  window: ChartXWindow,
  extent: readonly [number, number],
  scaleExtent: readonly [number, number] = DEFAULT_SCALE_EXTENT,
): ChartXWindow {
  const extentSpan = Math.max(extent[1] - extent[0], 1e-9);
  const minSpan = extentSpan / scaleExtent[1];
  const maxSpan = extentSpan / scaleExtent[0];

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
  if (start < extent[0]) {
    start = extent[0];
    end = start + span;
  }

  // Right edge: allow empty "future" space so the last candle can leave the
  // right border (drag chart left). Stop when the last candle reaches the left edge.
  if (start > extent[1]) {
    start = extent[1];
    end = start + span;
  }

  return { start, end };
}

/** Zoom around an anchor in [0, 1] within the current window (0 = left, 1 = right). */
export function zoomXWindowAt(
  window: ChartXWindow,
  extent: readonly [number, number],
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
  extent: readonly [number, number],
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
  return clampXWindow({ start, end }, sessionXExtent(candles.length));
}
