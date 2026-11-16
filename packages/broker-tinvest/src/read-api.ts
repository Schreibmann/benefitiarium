import type { CandleInterval } from '@moex/domain';
import type { TinvestFavoriteRaw } from './get-favorites-command.js';
import type {
  TinvestAccountRaw,
  TinvestCandleRaw,
  TinvestFutureRaw,
  TinvestGetTechAnalysisInput,
  TinvestIndicativeRaw,
  TinvestLastPriceRaw,
  TinvestOrderRaw,
  TinvestPositionRaw,
  TinvestShareRaw,
  TinvestTechAnalysisItemRaw,
  TinvestTradeRaw,
} from './raw.js';

/**
 * Narrow read port used by adapters. Live SDK client and fixture client both implement this.
 * Keeps MarketDataProvider/BrokerGateway free of SDK types.
 *
 * Futures catalog (`listFutures` / `getFutureByUid`) must stay separate from Indicatives.
 * `getFutureByUid` corresponds to T-Invest `FutureBy` (lookup by UID / ticker+class_code).
 */
export type TinvestReadApi = {
  listShares: () => Promise<TinvestShareRaw[]>;
  listFutures: () => Promise<TinvestFutureRaw[]>;
  listIndicatives: () => Promise<TinvestIndicativeRaw[]>;
  /** InstrumentsService.GetFavorites — client watchlist from T-Invest. */
  listFavorites: () => Promise<TinvestFavoriteRaw[]>;
  getShareByUid: (uid: string) => Promise<TinvestShareRaw | null>;
  getFutureByUid: (uid: string) => Promise<TinvestFutureRaw | null>;
  getIndicativeByUid: (uid: string) => Promise<TinvestIndicativeRaw | null>;
  getCandles: (input: {
    instrumentUid: string;
    interval: CandleInterval;
    from: Date;
    to: Date;
  }) => Promise<TinvestCandleRaw[]>;
  getLastPrices: (instrumentUids: string[]) => Promise<TinvestLastPriceRaw[]>;
  /**
   * MarketDataService.GetLastTrades — anonymized trades for the last hour only.
   * Required for true volume-at-price (horizontal volume); not a candle substitute.
   */
  getLastTrades: (input: {
    instrumentUid: string;
    from: Date;
    to: Date;
  }) => Promise<TinvestTradeRaw[]>;
  /**
   * MarketDataService.GetTechAnalysis — BB/EMA/RSI/MACD/SMA only.
   * No Fibonacci / horizontal volume in the broker API (see TECH_ANALYSIS_API_GAPS).
   */
  getTechAnalysis: (input: TinvestGetTechAnalysisInput) => Promise<TinvestTechAnalysisItemRaw[]>;
  listAccounts: () => Promise<TinvestAccountRaw[]>;
  getPositions: (accountId: string) => Promise<TinvestPositionRaw[]>;
  getOrders: (accountId: string) => Promise<TinvestOrderRaw[]>;
  getOrderById: (accountId: string, brokerOrderId: string) => Promise<TinvestOrderRaw | null>;
};

export type InstrumentUidResolver = {
  toProviderUid: (instrumentId: string) => string | null;
  toInstrumentId: (providerUid: string) => string | null;
};
