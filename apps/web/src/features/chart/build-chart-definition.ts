import { defineChart, link, text } from '@tanstack/charts';
import { scaleLinear, scaleUtc } from 'd3-scale';
import { pivotLabelRows } from './to-pivot-segments.js';
import type { CandleRow, PivotSegment } from './types.js';

const PIVOT_STROKE: Record<PivotSegment['level'], string> = {
  P: 'var(--chart-pivot-p)',
  R1: 'var(--chart-pivot-r)',
  R2: 'var(--chart-pivot-r)',
  R3: 'var(--chart-pivot-r)',
  S1: 'var(--chart-pivot-s)',
  S2: 'var(--chart-pivot-s)',
  S3: 'var(--chart-pivot-s)',
};

export function buildPriceChartDefinition(input: {
  candles: readonly CandleRow[];
  pivots: readonly PivotSegment[];
}) {
  const candles = [...input.candles];
  const gains = candles.filter((row) => row.Close >= row.Open);
  const losses = candles.filter((row) => row.Close < row.Open);
  const pivots = [...input.pivots];
  const labels = pivotLabelRows(pivots);

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
      link(candles, {
        id: 'candle-wicks',
        x1: 'Date',
        y1: 'Low',
        x2: 'Date',
        y2: 'High',
        key: (d) => d.Date.toISOString(),
        stroke: 'var(--chart-wick)',
        strokeWidth: 1,
      }),
      link(gains, {
        id: 'candle-bodies-up',
        x1: 'Date',
        y1: 'Open',
        x2: 'Date',
        y2: 'Close',
        key: (d) => `up:${d.Date.toISOString()}`,
        stroke: 'var(--chart-up)',
        strokeWidth: 5,
      }),
      link(losses, {
        id: 'candle-bodies-down',
        x1: 'Date',
        y1: 'Open',
        x2: 'Date',
        y2: 'Close',
        key: (d) => `down:${d.Date.toISOString()}`,
        stroke: 'var(--chart-down)',
        strokeWidth: 5,
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
        dx: -4,
        dy: -6,
        anchor: 'end',
      }),
    ],
    scales: {
      x: {
        scale: scaleUtc,
        grid: false,
        axis: { label: 'Time (UTC)' },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Price' },
      },
    },
  });
}
