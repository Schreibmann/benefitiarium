import { barY, defineChart, link, text } from '@tanstack/charts';
import { controlledSignal } from '@tanstack/charts/interaction/signal';
import { type ZoomXChange, type ZoomXWindow, zoomX } from '@tanstack/charts/interaction/zoom';
import { scaleLinear } from 'd3-scale';
import { candlePriceDomain, type SessionCandleRow } from './session-scale.js';
import { pivotLabelRows } from './to-pivot-segments.js';
import type { PivotSegment } from './types.js';

const PIVOT_STROKE: Record<PivotSegment['level'], string> = {
  P: 'var(--chart-pivot-p)',
  R1: 'var(--chart-pivot-r)',
  R2: 'var(--chart-pivot-r)',
  R3: 'var(--chart-pivot-r)',
  S1: 'var(--chart-pivot-s)',
  S2: 'var(--chart-pivot-s)',
  S3: 'var(--chart-pivot-s)',
};

export type ChartXWindow = ZoomXWindow<number>;

type CandleBodyRow = SessionCandleRow & {
  BodyLow: number;
  BodyHigh: number;
};

function toBodyRows(rows: readonly SessionCandleRow[]): CandleBodyRow[] {
  return rows.map((row) => {
    const bodyLow = Math.min(row.Open, row.Close);
    const bodyHigh = Math.max(row.Open, row.Close);
    if (bodyHigh > bodyLow) {
      return { ...row, BodyLow: bodyLow, BodyHigh: bodyHigh };
    }
    const pad = Math.max(Math.abs(bodyLow) * 1e-4, 1e-6);
    return { ...row, BodyLow: bodyLow - pad, BodyHigh: bodyHigh + pad };
  });
}

function formatSessionTick(candles: readonly SessionCandleRow[], index: number): string {
  const candle = candles.find((row) => row.index === Math.round(index));
  if (candle === undefined) {
    return '';
  }
  return candle.Date.toISOString().slice(5, 16).replace('T', ' ');
}

/** Candles inside the committed x window (for y autoscaling only — marks keep full series). */
export function visibleCandles(
  candles: readonly SessionCandleRow[],
  window: ChartXWindow,
): SessionCandleRow[] {
  const start = Math.min(window.start, window.end);
  const end = Math.max(window.start, window.end);
  return candles.filter((candle) => candle.index >= start && candle.index <= end);
}

export function sessionXExtent(candles: readonly SessionCandleRow[]): readonly [number, number] {
  if (candles.length > 1) {
    return [0, candles.length - 1];
  }
  return [-0.5, 0.5];
}

/** Default view: last ~120 bars (or full series when shorter). */
export function defaultSessionXWindow(
  candles: readonly SessionCandleRow[],
  visibleBars = 120,
): ChartXWindow {
  const extent = sessionXExtent(candles);
  const span = extent[1] - extent[0];
  if (span <= visibleBars) {
    return { start: extent[0], end: extent[1] };
  }
  return { start: extent[1] - visibleBars, end: extent[1] };
}

export function buildPriceChartDefinition(input: {
  candles: readonly SessionCandleRow[];
  pivots: readonly PivotSegment[];
  xWindow: ChartXWindow;
  xExtent: readonly [number, number];
  onXWindowChange: (next: ChartXWindow) => void;
}) {
  const candles = [...input.candles];
  // Keep the full series in marks so pan can reveal off-window bars.
  // Only the price domain follows the visible window.
  const visible = visibleCandles(candles, input.xWindow);
  const gains = toBodyRows(candles.filter((row) => row.Close >= row.Open));
  const losses = toBodyRows(candles.filter((row) => row.Close < row.Open));
  const pivots = [...input.pivots];
  const labels = pivotLabelRows(pivots);
  const priceDomain = candlePriceDomain(visible.length > 0 ? visible : candles);

  return defineChart({
    marks: [
      link(pivots, {
        id: 'fibonacci-pivots',
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        key: 'id',
        stroke: (d) => PIVOT_STROKE[d.level],
        strokeWidth: (d) => (d.level === 'P' ? 1.75 : 1.1),
        strokeOpacity: 0.9,
      }),
      link(gains, {
        id: 'candle-wicks-up',
        x1: 'index',
        y1: 'Low',
        x2: 'index',
        y2: 'High',
        key: (d) => `wick-up:${d.index}`,
        stroke: 'var(--chart-up)',
        strokeWidth: 1,
      }),
      link(losses, {
        id: 'candle-wicks-down',
        x1: 'index',
        y1: 'Low',
        x2: 'index',
        y2: 'High',
        key: (d) => `wick-down:${d.index}`,
        stroke: 'var(--chart-down)',
        strokeWidth: 1,
      }),
      barY(gains, {
        id: 'candle-bodies-up',
        x: 'index',
        y1: 'BodyLow',
        y2: 'BodyHigh',
        key: (d) => `up:${d.index}`,
        fill: 'var(--chart-up)',
        stroke: 'var(--chart-up)',
        strokeWidth: 1,
        maxThickness: 14,
      }),
      barY(losses, {
        id: 'candle-bodies-down',
        x: 'index',
        y1: 'BodyLow',
        y2: 'BodyHigh',
        key: (d) => `down:${d.index}`,
        fill: 'var(--chart-down)',
        stroke: 'var(--chart-down)',
        strokeWidth: 1,
        maxThickness: 14,
      }),
      text(labels, {
        id: 'pivot-labels',
        x: 'x2',
        y: 'y1',
        text: 'level',
        key: (d) => `label:${d.id}`,
        fill: (d) => PIVOT_STROKE[d.level],
        fontSize: 11,
        fontWeight: 600,
        dx: -6,
        dy: -6,
        anchor: 'end',
      }),
    ],
    scales: {
      x: {
        scale: scaleLinear,
        // Match TanStack zoomX contract: scale domain === controlled window;
        // marks keep the full series so pan can reveal neighboring bars.
        domain: [input.xWindow.start, input.xWindow.end],
        grid: false,
        axis: {
          label: 'Session',
          ticks: {
            format: (value: number) => formatSessionTick(candles, value),
          },
        },
      },
      y: {
        scale: scaleLinear,
        ...(priceDomain !== null ? { domain: [priceDomain.min, priceDomain.max] } : {}),
        grid: true,
        side: 'right',
        axis: { label: 'Price' },
      },
    },
    controls: [
      zoomX({
        window: controlledSignal<ChartXWindow, ZoomXChange<number>>(input.xWindow, (next) => {
          input.onXWindowChange(next);
        }),
        extent: input.xExtent,
        scaleExtent: [1, 64],
        wheelActivation: 'always',
        ariaLabel: 'Zoom and pan price chart',
        format: (value) => formatSessionTick(candles, value),
      }),
    ],
  });
}
