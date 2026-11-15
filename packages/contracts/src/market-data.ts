import type {
  AssetType,
  Candle,
  CandleInterval,
  DataProvider,
  DecimalString,
  InstrumentId,
  InstrumentSpec,
  IsoDateTime,
  Quote,
} from '@moex/domain';

/**
 * Provider-native instrument listing row before internal UUID mapping.
 * Must not carry SDK/protobuf types.
 */
export type ProviderInstrument = {
  provider: DataProvider;
  providerInstrumentId: string;
  assetType: AssetType;
  ticker: string;
  name: string;
  currency: string | null;
  classCode: string | null;
  engine: string | null;
  market: string | null;
  board: string | null;
  secid: string | null;
  isActive: boolean;
};

/** Spec payload from a provider before persistence versioning. */
export type InstrumentSpecInput = Omit<InstrumentSpec, 'instrumentId' | 'validFrom' | 'validTo'> & {
  providerInstrumentId: string;
  validFrom: IsoDateTime;
  validTo: IsoDateTime | null;
};

export type LastPrice = Pick<
  Quote,
  'instrumentId' | 'provider' | 'eventTime' | 'receivedAt' | 'quality'
> & {
  last: DecimalString;
};

export type GetCandlesInput = {
  instrumentId: InstrumentId;
  interval: CandleInterval;
  from: Date;
  to: Date;
  cursor?: string;
};

export type GetCandlesResult = {
  items: Candle[];
  nextCursor?: string;
};

export type MarketTradeDirection = 'buy' | 'sell' | 'unspecified';

/** Provider-normalized anonymized trade (lots), used for volume profile. */
export type MarketTrade = {
  instrumentId: InstrumentId;
  provider: DataProvider;
  price: DecimalString;
  quantity: DecimalString;
  direction: MarketTradeDirection;
  eventTime: IsoDateTime;
};

export type GetTradesInput = {
  instrumentId: InstrumentId;
  from: Date;
  to: Date;
};

export type GetTradesResult = {
  items: MarketTrade[];
  effectiveFrom: IsoDateTime;
  effectiveTo: IsoDateTime;
  /** History MD day archives successfully loaded (YYYY-MM-DD). */
  historyTradeDays: string[];
  /** Days requested but archive returned 404. */
  missingDays: string[];
  /** Whether a live GetLastTrades fragment for “today” was merged. */
  lastTradesIncluded: boolean;
  source: 'history_trades' | 'last_trades' | 'mixed';
};

/** @deprecated Prefer GetTradesInput — kept as alias during migration. */
export type GetLastTradesInput = GetTradesInput;
/** @deprecated Prefer GetTradesResult. */
export type GetLastTradesResult = GetTradesResult;

/**
 * Read-only historical market-data port.
 * Implementations live in provider adapters; consumers depend only on this interface.
 */
export type HistoricalMarketDataProvider = {
  getCandles: (input: GetCandlesInput) => Promise<GetCandlesResult>;
};

/**
 * Catalog + snapshot market-data port (no broker write methods).
 */
export type MarketDataProvider = HistoricalMarketDataProvider & {
  getInstrumentCatalog: () => Promise<ProviderInstrument[]>;
  getInstrumentSpec: (providerInstrumentId: string) => Promise<InstrumentSpecInput>;
  getLastPrices: (instrumentIds: InstrumentId[]) => Promise<LastPrice[]>;
  /**
   * Anonymized trades for a range.
   * T-Invest: History MD `/history-trades/{date}` per day (week/month),
   * plus optional GetLastTrades fragment for the current UTC day.
   */
  getTrades: (input: GetTradesInput) => Promise<GetTradesResult>;
};
