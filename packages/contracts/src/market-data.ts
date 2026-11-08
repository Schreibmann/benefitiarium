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
};
