import type { DecimalString } from '@moex/domain';

/** Local OHLCV approximation — not exchange volume-at-price (GetLastTrades). */
export const HORIZONTAL_VOLUME_ALGORITHM_ID = 'HORIZONTAL_VOLUME_OHLCV' as const;
export const HORIZONTAL_VOLUME_ALGORITHM_VERSION = '1.0.0' as const;
export const HORIZONTAL_VOLUME_SOURCE_KIND = 'ohlcv_uniform_approximation' as const;

/** Classic value-area coverage of total volume. */
export const HORIZONTAL_VOLUME_DEFAULT_VALUE_AREA_RATIO = '0.70' as const;

/** Soft cap on histogram bins; row size grows when the range would exceed this. */
export const HORIZONTAL_VOLUME_MAX_LEVELS = 2000;

export type HorizontalVolumeCandle = {
  high: DecimalString | string;
  low: DecimalString | string;
  volume: DecimalString | string;
};

export type HorizontalVolumeLevel = {
  price: DecimalString;
  volume: DecimalString;
};

export type HorizontalVolumeQuality = 'ok' | 'EMPTY' | 'DEGENERATE';

export type HorizontalVolumeCalculation = {
  levels: HorizontalVolumeLevel[];
  totalVolume: DecimalString;
  /** Point of Control — price row with the highest volume. */
  poc: DecimalString | null;
  /** Value Area High. */
  vah: DecimalString | null;
  /** Value Area Low. */
  val: DecimalString | null;
  tickSize: DecimalString;
  rowSizeInTicks: number;
  rowSize: DecimalString;
  valueAreaRatio: DecimalString;
  sourceKind: typeof HORIZONTAL_VOLUME_SOURCE_KIND;
  quality: HorizontalVolumeQuality;
  algorithmId: typeof HORIZONTAL_VOLUME_ALGORITHM_ID;
  algorithmVersion: typeof HORIZONTAL_VOLUME_ALGORITHM_VERSION;
};

export type CalculateHorizontalVolumeInput = {
  candles: readonly HorizontalVolumeCandle[];
  tickSize: DecimalString | string;
  /** Optional fixed bin height in ticks; when omitted, auto-grows to stay ≤ MAX_LEVELS. */
  rowSizeInTicks?: number;
  valueAreaRatio?: DecimalString | string;
};
