export type ChartTimeframe = '1m' | '5m' | '1h';

export type CandleRow = {
  Date: Date;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  isClosed: boolean;
};

export type PivotLevelName = 'P' | 'R1' | 'R2' | 'R3' | 'S1' | 'S2' | 'S3';

export type PivotSegment = {
  id: string;
  periodId: string;
  level: PivotLevelName;
  /** Session index (packed trading bars), not wall-clock time. */
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

export type InstrumentLookup = {
  instrumentUid: string;
  ticker: string;
  name: string;
  assetType: string;
};

export type FuturesListCategory = 'commodity' | 'equity_index' | 'currency' | 'share';

export type FuturesFamilyContract = {
  role: 'near' | 'next';
  ticker: string;
  instrumentUid: string;
  name: string;
  expirationAt: string;
  classCode: string | null;
  isActive: boolean;
};

export type FuturesFamily = {
  family: string;
  underlyingAssetName: string | null;
  contracts: FuturesFamilyContract[];
};

export type FuturesCategoryBucket = {
  category: FuturesListCategory;
  families: FuturesFamily[];
};

export type FuturesCatalogResponse = {
  syncedAt: string;
  categories: FuturesCategoryBucket[];
};

export type FibonacciPivotApiResponse = {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  referenceTimeframe: '1D' | '1W';
  periods: Array<{
    sourcePeriod: {
      id: string;
      timeframe: '1D' | '1W';
      start: string;
      end: string;
    };
    validPeriod: {
      id: string;
      start: string;
      end: string;
    };
    values: {
      p: string;
      r1: string;
      r2: string;
      r3: string;
      s1: string;
      s2: string;
      s3: string;
    };
    algorithm: {
      id: string;
      version: string;
    };
  }>;
  meta: {
    requestedFrom: string;
    requestedTo: string;
    hasGaps: boolean;
    missingPeriodIds?: string[];
  };
};

export type HorizontalVolumeApiResponse = {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  levels: Array<{
    price: string;
    volume: string;
    buyVolume: string;
    sellVolume: string;
  }>;
  totalVolume: string;
  totalBuyVolume: string;
  totalSellVolume: string;
  volumeUnit: string;
  poc: string | null;
  vah: string | null;
  val: string | null;
  tickSize: string;
  rowSizeInTicks: number;
  rowSize: string;
  valueAreaRatio: string;
  sourceKind: 'last_trades' | 'ohlcv_uniform_approximation';
  quality: 'ok' | 'EMPTY' | 'DEGENERATE';
  algorithm: {
    id: string;
    version: string;
  };
  meta: {
    requestedFrom: string;
    requestedTo: string;
    effectiveFrom: string;
    effectiveTo: string;
    tradeCount: number;
    historyTradeDays: string[];
    missingDays: string[];
    lastTradesIncluded: boolean;
    tradesSource: 'history_trades' | 'last_trades' | 'mixed';
    calculatedAt: string;
  };
};

export type VolumeProfileSegmentKind = 'buy' | 'sell' | 'poc' | 'vah' | 'val';

export type VolumeProfileSegment = {
  id: string;
  kind: VolumeProfileSegmentKind;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  inValueArea: boolean;
};
