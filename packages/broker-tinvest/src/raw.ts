/**
 * Internal JSON-friendly shapes used at the SDK boundary.
 * Adapters normalize SDK Decimal/Date into these before mapping to domain/contracts.
 * Never export these types from the public package surface as SDK substitutes.
 */

export type TinvestShareRaw = {
  uid: string;
  figi: string | null;
  ticker: string;
  name: string;
  classCode: string;
  currency: string;
  lot: number;
  minPriceIncrement: string;
  apiTradeAvailableFlag: boolean;
  forQualInvestorFlag: boolean;
  first1dayCandleDate: string | null;
  first1minCandleDate: string | null;
  exchange: string | null;
};

export type TinvestFutureRaw = {
  uid: string;
  figi: string | null;
  ticker: string;
  name: string;
  classCode: string;
  currency: string;
  lot: number;
  minPriceIncrement: string;
  minPriceIncrementAmount: string | null;
  /**
   * Future.asset_type from InstrumentsService.Futures:
   * commodity | currency | security | index (also TYPE_* / ASSET_TYPE_* from live SDK).
   */
  assetType: string | null;
  /**
   * Future.sector — primary category signal when it maps to a known list category;
   * otherwise fall back to assetType (see resolveFuturesListCategory).
   */
  sector: string | null;
  basicAsset: string | null;
  basicAssetPositionUid: string | null;
  expirationDate: string | null;
  first1minCandleDate: string | null;
  first1dayCandleDate: string | null;
  initialMarginOnBuy: string | null;
  futuresType: string | null;
  apiTradeAvailableFlag: boolean;
};

/** GetTechAnalysis IndicatorType labels (BB/EMA/RSI/MACD/SMA only — no Fibonacci / volume profile). */
export type TinvestTechAnalysisIndicatorType = 'bb' | 'ema' | 'rsi' | 'macd' | 'sma';

export type TinvestTechAnalysisInterval =
  | '1m'
  | '2m'
  | '3m'
  | '5m'
  | '10m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '1d'
  | '1w'
  | '1M';

export type TinvestTechAnalysisPriceType = 'close' | 'open' | 'high' | 'low' | 'avg';

export type TinvestTechAnalysisItemRaw = {
  timestamp: string;
  middleBand: string | null;
  upperBand: string | null;
  lowerBand: string | null;
  signal: string | null;
  macd: string | null;
};

export type TinvestGetTechAnalysisInput = {
  instrumentUid: string;
  indicatorType: TinvestTechAnalysisIndicatorType;
  from: Date;
  to: Date;
  interval: TinvestTechAnalysisInterval;
  typeOfPrice: TinvestTechAnalysisPriceType;
  length?: number;
  deviationMultiplier?: string;
  smoothing?: {
    fastLength: number;
    slowLength: number;
    signalSmoothing: number;
  };
};

/**
 * Indicative instruments (e.g. IMOEX index, oil spot) — not tradeable futures contracts.
 * Must never be mixed with Futures catalog rows when building contract history.
 */
export type TinvestIndicativeRaw = {
  uid: string;
  figi: string | null;
  ticker: string;
  name: string;
  classCode: string;
  currency: string;
  exchange: string | null;
  buyAvailableFlag: boolean;
  sellAvailableFlag: boolean;
};

export type TinvestFavoriteInstrumentRaw = {
  uid: string | null;
  figi: string | null;
  ticker: string;
  classCode: string;
  isin: string | null;
  name: string | null;
  instrumentType: string | null;
  instrumentKind: string | null;
  otcFlag: boolean;
  apiTradeAvailableFlag: boolean;
};

export type TinvestCandleRaw = {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  isComplete: boolean;
};

export type TinvestLastPriceRaw = {
  instrumentUid: string;
  price: string;
  time: string;
};

export type TinvestTradeDirection = 'buy' | 'sell' | 'unspecified';

/** Anonymized trade from MarketDataService.GetLastTrades (last-hour window). */
export type TinvestTradeRaw = {
  instrumentUid: string;
  price: string;
  /** Lots. */
  quantity: string;
  direction: TinvestTradeDirection;
  time: string;
};

export type TinvestAccountRaw = {
  id: string;
  type: string | null;
  name: string | null;
  status: string | null;
};

export type TinvestPositionRaw = {
  instrumentUid: string;
  figi: string | null;
  quantity: string;
  averagePositionPrice: string | null;
  currentPrice: string | null;
  currency: string | null;
};

export type TinvestOrderRaw = {
  orderId: string;
  orderRequestId: string | null;
  instrumentUid: string;
  direction: 'ORDER_DIRECTION_BUY' | 'ORDER_DIRECTION_SELL' | string;
  orderType: 'ORDER_TYPE_LIMIT' | 'ORDER_TYPE_MARKET' | string;
  lotsRequested: number;
  lotsExecuted: number;
  initialSecurityPrice: string | null;
  executionReportStatus: string;
  orderDate: string | null;
};
