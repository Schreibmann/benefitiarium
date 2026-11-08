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
  /** T-Invest Future.assetType string (commodity / currency / share / index / …). */
  assetType: string | null;
  basicAsset: string | null;
  basicAssetPositionUid: string | null;
  expirationDate: string | null;
  first1minCandleDate: string | null;
  first1dayCandleDate: string | null;
  initialMarginOnBuy: string | null;
  futuresType: string | null;
  apiTradeAvailableFlag: boolean;
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
