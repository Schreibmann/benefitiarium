import type { DecimalString } from '@moex/domain';

/** OHLCV uniform approximation (research / fallback). */
export const HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID = 'HORIZONTAL_VOLUME_OHLCV' as const;
/** True volume-at-price from anonymized trades (GetLastTrades). */
export const HORIZONTAL_VOLUME_TRADES_ALGORITHM_ID = 'HORIZONTAL_VOLUME_TRADES' as const;

export const HORIZONTAL_VOLUME_ALGORITHM_VERSION = '1.2.0' as const;

export const HORIZONTAL_VOLUME_SOURCE_KIND = {
  ohlcvUniformApproximation: 'ohlcv_uniform_approximation',
  lastTrades: 'last_trades',
} as const;

export type HorizontalVolumeSourceKind =
  (typeof HORIZONTAL_VOLUME_SOURCE_KIND)[keyof typeof HORIZONTAL_VOLUME_SOURCE_KIND];

export type HorizontalVolumeAlgorithmId =
  | typeof HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID
  | typeof HORIZONTAL_VOLUME_TRADES_ALGORITHM_ID;

/** Classic value-area coverage of total volume. */
export const HORIZONTAL_VOLUME_DEFAULT_VALUE_AREA_RATIO = '0.70' as const;

/**
 * TradingView-style default row count for auto binning
 * (`rowSizeInTicks = ceil(tickSpan / targetRows)`).
 */
export const HORIZONTAL_VOLUME_DEFAULT_TARGET_ROWS = 100;

/** Hard safety cap on histogram bins; never auto-exceed this. */
export const HORIZONTAL_VOLUME_MAX_LEVELS = 2000;

/** @deprecated Use HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID / TRADES. */
export const HORIZONTAL_VOLUME_ALGORITHM_ID = HORIZONTAL_VOLUME_OHLCV_ALGORITHM_ID;

export type HorizontalVolumeCandle = {
  high: DecimalString | string;
  low: DecimalString | string;
  volume: DecimalString | string;
};

export type HorizontalVolumeTrade = {
  price: DecimalString | string;
  quantity: DecimalString | string;
  direction?: 'buy' | 'sell' | 'unspecified';
};

export type HorizontalVolumeLevel = {
  price: DecimalString;
  volume: DecimalString;
  buyVolume: DecimalString;
  sellVolume: DecimalString;
};

export type HorizontalVolumeQuality = 'ok' | 'EMPTY' | 'DEGENERATE';

export type HorizontalVolumeCalculation = {
  levels: HorizontalVolumeLevel[];
  totalVolume: DecimalString;
  totalBuyVolume: DecimalString;
  totalSellVolume: DecimalString;
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
  sourceKind: HorizontalVolumeSourceKind;
  quality: HorizontalVolumeQuality;
  algorithmId: HorizontalVolumeAlgorithmId;
  algorithmVersion: typeof HORIZONTAL_VOLUME_ALGORITHM_VERSION;
};

export type CalculateHorizontalVolumeInput = {
  candles: readonly HorizontalVolumeCandle[];
  tickSize: DecimalString | string;
  /** Optional fixed bin height in ticks; when omitted, auto-bins toward targetRowCount. */
  rowSizeInTicks?: number;
  /** Auto-binning target (default 100). Ignored when rowSizeInTicks is set. */
  targetRowCount?: number;
  valueAreaRatio?: DecimalString | string;
};

export type CalculateHorizontalVolumeFromTradesInput = {
  trades: readonly HorizontalVolumeTrade[];
  tickSize: DecimalString | string;
  rowSizeInTicks?: number;
  targetRowCount?: number;
  valueAreaRatio?: DecimalString | string;
};
