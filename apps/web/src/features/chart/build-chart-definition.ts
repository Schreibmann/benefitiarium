import { barY, defineChart, link, text } from '@tanstack/charts';
import { scaleLinear } from 'd3-scale';
import { dateAtSessionIndex } from './chart-time.js';
import type { ChartXExtent, ChartXWindow } from './chart-viewport.js';
import { candlePriceDomain, type SessionCandleRow } from './session-scale.js';
import { pivotLabelRows } from './to-pivot-segments.js';
import type { ChartTimeframe, PivotSegment, VolumeProfileSegment } from './types.js';

export type { ChartTimeRange, ChartXExtent, ChartXWindow } from './chart-viewport.js';
export {
  clampXWindow,
  defaultSessionXWindow,
  panXWindow,
  sessionXExtent,
  timeRangeFromXWindow,
  xWindowFromTimeRange,
  zoomXWindowAt,
} from './chart-viewport.js';

const PIVOT_STROKE: Record<PivotSegment['level'], string> = {
  P: 'var(--chart-pivot-p)',
  R1: 'var(--chart-pivot-r)',
  R2: 'var(--chart-pivot-r)',
  R3: 'var(--chart-pivot-r)',
  S1: 'var(--chart-pivot-s)',
  S2: 'var(--chart-pivot-s)',
  S3: 'var(--chart-pivot-s)',
};

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

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local clock time as HH:mm; extrapolates into the future pad. */
export function formatSessionTick(
  candles: readonly SessionCandleRow[],
  index: number,
  timeframe: ChartTimeframe = '5m',
): string {
  const date = dateAtSessionIndex(candles, index, timeframe);
  if (date === null) {
    return '';
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatPriceTick(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return value.toFixed(0);
  }
  if (abs >= 10) {
    return value.toFixed(2);
  }
  if (abs >= 1) {
    return value.toFixed(3);
  }
  return value.toFixed(4);
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

function priceDomainWithOverlays(
  candles: readonly SessionCandleRow[],
  pivots: readonly PivotSegment[],
  volumeProfile: readonly VolumeProfileSegment[],
): { min: number; max: number } | null {
  const base = candlePriceDomain(candles);
  if (base === null) {
    return null;
  }
  let min = base.min;
  let max = base.max;
  for (const pivot of pivots) {
    if (pivot.y1 < min) {
      min = pivot.y1;
    }
    if (pivot.y1 > max) {
      max = pivot.y1;
    }
  }
  for (const segment of volumeProfile) {
    if (segment.kind === 'histogram') {
      continue;
    }
    if (segment.y1 < min) {
      min = segment.y1;
    }
    if (segment.y1 > max) {
      max = segment.y1;
    }
  }
  return { min, max };
}

const VOLUME_PROFILE_STROKE: Record<VolumeProfileSegment['kind'], string> = {
  histogram: 'var(--chart-volume-bar)',
  poc: 'var(--chart-volume-poc)',
  vah: 'var(--chart-volume-va)',
  val: 'var(--chart-volume-va)',
};

export function buildPriceChartDefinition(input: {
  candles: readonly SessionCandleRow[];
  pivots: readonly PivotSegment[];
  volumeProfile?: readonly VolumeProfileSegment[];
  xWindow: ChartXWindow;
  xExtent: ChartXExtent;
  timeframe: ChartTimeframe;
}) {
  const candles = [...input.candles];
  const visible = visibleCandles(candles, input.xWindow);
  const gains = toBodyRows(candles.filter((row) => row.Close >= row.Open));
  const losses = toBodyRows(candles.filter((row) => row.Close < row.Open));
  const pivots = [...input.pivots];
  const volumeProfile = [...(input.volumeProfile ?? [])];
  const histogram = volumeProfile.filter((segment) => segment.kind === 'histogram');
  const volumeGuides = volumeProfile.filter((segment) => segment.kind !== 'histogram');
  const axisLevels = pivotLabelRows(pivots);
  const priceDomain = priceDomainWithOverlays(
    visible.length > 0 ? visible : candles,
    axisLevels,
    volumeGuides,
  );
  const yScale =
    priceDomain === null
      ? scaleLinear()
      : scaleLinear().domain([priceDomain.min, priceDomain.max]).nice(8);

  const axisPriceRows = axisLevels.map((row) => ({
    ...row,
    label: formatPriceTick(row.y1),
    axisX: input.xWindow.end,
  }));

  const regularTicks = yScale.ticks(6);
  const fibTicks = axisLevels.map((row) => row.y1);
  const yTickValues = [...new Set([...regularTicks, ...fibTicks])].sort((a, b) => a - b);

  return defineChart({
    marks: [
      link(histogram, {
        id: 'horizontal-volume-bars',
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        key: 'id',
        stroke: VOLUME_PROFILE_STROKE.histogram,
        strokeWidth: 4,
        strokeOpacity: 0.35,
      }),
      link(volumeGuides, {
        id: 'horizontal-volume-guides',
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        key: 'id',
        stroke: (d) => VOLUME_PROFILE_STROKE[d.kind],
        strokeWidth: (d) => (d.kind === 'poc' ? 1.6 : 1.1),
        strokeOpacity: 0.85,
      }),
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
      text(axisPriceRows, {
        id: 'pivot-price-axis',
        x: 'axisX',
        y: 'y1',
        text: 'label',
        key: (d) => `axis-price:${d.id}`,
        fill: (d) => PIVOT_STROKE[d.level],
        fontSize: 11,
        fontWeight: 600,
        // Sit just inside the right plot edge so the clip does not hide them.
        dx: -4,
        dy: 3,
        anchor: 'end',
      }),
      text(axisLevels, {
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
        scale: scaleLinear().domain([input.xExtent.start, input.xExtent.contentEnd]),
        viewport: { domain: [input.xWindow.start, input.xWindow.end] },
        grid: false,
        axis: {
          ticks: {
            count: 8,
            format: (value: number) => formatSessionTick(candles, value, input.timeframe),
          },
        },
      },
      y: {
        scale: yScale,
        grid: true,
        side: 'right',
        axis: {
          ticks: {
            values: yTickValues,
            size: 6,
            format: (value: number) => {
              const fib = axisLevels.find((row) => Math.abs(row.y1 - value) < 1e-9);
              if (fib !== undefined) {
                return '';
              }
              return formatPriceTick(value);
            },
          },
        },
      },
    },
  });
}
