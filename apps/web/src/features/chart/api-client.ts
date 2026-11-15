import type {
  CandleRow,
  ChartTimeframe,
  FibonacciPivotApiResponse,
  FuturesCatalogResponse,
  FuturesCategoryBucket,
  FuturesFamily,
  FuturesFamilyContract,
  FuturesListCategory,
  HorizontalVolumeApiResponse,
  InstrumentLookup,
} from './types.js';

export type ChartApiClient = {
  lookupByTicker: (ticker: string) => Promise<InstrumentLookup>;
  listFuturesCatalog: () => Promise<FuturesCatalogResponse>;
  getCandles: (input: {
    instrumentUid: string;
    interval: ChartTimeframe;
    from: string;
    to: string;
  }) => Promise<CandleRow[]>;
  getFibonacciPivots: (input: {
    instrumentUid: string;
    timeframe: ChartTimeframe;
    from: string;
    to: string;
  }) => Promise<FibonacciPivotApiResponse>;
  getHorizontalVolume: (input: {
    instrumentUid: string;
    timeframe: ChartTimeframe;
    from: string;
    to: string;
    signal?: AbortSignal;
  }) => Promise<HorizontalVolumeApiResponse>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field ${key}`);
  }
  return value;
}

function toFiniteNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric field ${field}`);
  }
  return parsed;
}

export function createChartApiClient(
  options: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): ChartApiClient {
  const baseUrl = options.baseUrl ?? '';
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(path: string, init?: { signal?: AbortSignal }): Promise<unknown> {
    const response = await fetchImpl(
      `${baseUrl}${path}`,
      init?.signal !== undefined ? { signal: init.signal } : undefined,
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API ${response.status}: ${body || response.statusText}`);
    }
    return response.json();
  }

  return {
    lookupByTicker: async (ticker) => {
      const json = await request(`/api/v1/instruments/by-ticker/${encodeURIComponent(ticker)}`);
      if (!isRecord(json)) {
        throw new Error('Invalid lookup response');
      }
      return {
        instrumentUid: requiredString(json, 'instrumentUid'),
        ticker: requiredString(json, 'ticker'),
        name: requiredString(json, 'name'),
        assetType: requiredString(json, 'assetType'),
      };
    },

    listFuturesCatalog: async () => {
      const json = await request('/api/v1/instruments/futures');
      return parseFuturesCatalogResponse(json);
    },

    getCandles: async (input) => {
      const path =
        `/api/v1/instruments/${encodeURIComponent(input.instrumentUid)}/candles` +
        `?interval=${encodeURIComponent(input.interval)}` +
        `&from=${encodeURIComponent(input.from)}` +
        `&to=${encodeURIComponent(input.to)}`;
      const json = await request(path);
      if (!isRecord(json) || !Array.isArray(json.items)) {
        throw new Error('Invalid candles response');
      }
      return json.items.map((item) => {
        if (!isRecord(item)) {
          throw new Error('Invalid candle row');
        }
        const timeStart = requiredString(item, 'timeStart');
        return {
          Date: new Date(timeStart),
          Open: toFiniteNumber(requiredString(item, 'open'), 'open'),
          High: toFiniteNumber(requiredString(item, 'high'), 'high'),
          Low: toFiniteNumber(requiredString(item, 'low'), 'low'),
          Close: toFiniteNumber(requiredString(item, 'close'), 'close'),
          Volume: toFiniteNumber(requiredString(item, 'volume'), 'volume'),
          isClosed: item.isClosed === true,
        };
      });
    },

    getFibonacciPivots: async (input) => {
      const path =
        `/api/v1/instruments/${encodeURIComponent(input.instrumentUid)}/indicators/fibonacci-pivots` +
        `?timeframe=${encodeURIComponent(input.timeframe)}` +
        `&from=${encodeURIComponent(input.from)}` +
        `&to=${encodeURIComponent(input.to)}`;
      const json = await request(path);
      if (!isRecord(json) || !Array.isArray(json.periods)) {
        throw new Error('Invalid pivots response');
      }
      const instrumentUid = requiredString(json, 'instrumentUid');
      const chartTimeframeRaw = requiredString(json, 'chartTimeframe');
      if (chartTimeframeRaw !== '1m' && chartTimeframeRaw !== '5m' && chartTimeframeRaw !== '1h') {
        throw new Error('Invalid chartTimeframe');
      }
      const referenceTimeframeRaw = requiredString(json, 'referenceTimeframe');
      if (referenceTimeframeRaw !== '1D' && referenceTimeframeRaw !== '1W') {
        throw new Error('Invalid referenceTimeframe');
      }
      if (!isRecord(json.meta)) {
        throw new Error('Invalid pivots meta');
      }
      const periods: FibonacciPivotApiResponse['periods'] = [];
      for (const period of json.periods) {
        periods.push(parsePivotPeriod(period));
      }
      return {
        instrumentUid,
        chartTimeframe: chartTimeframeRaw,
        referenceTimeframe: referenceTimeframeRaw,
        periods,
        meta: buildPivotMeta(json.meta),
      };
    },

    getHorizontalVolume: async (input) => {
      const path =
        `/api/v1/instruments/${encodeURIComponent(input.instrumentUid)}/indicators/horizontal-volume` +
        `?timeframe=${encodeURIComponent(input.timeframe)}` +
        `&from=${encodeURIComponent(input.from)}` +
        `&to=${encodeURIComponent(input.to)}`;
      const json = await request(
        path,
        input.signal !== undefined ? { signal: input.signal } : undefined,
      );
      return parseHorizontalVolumeResponse(json);
    },
  };
}

function parseHorizontalVolumeResponse(json: unknown): HorizontalVolumeApiResponse {
  if (!isRecord(json) || !Array.isArray(json.levels) || !isRecord(json.meta)) {
    throw new Error('Invalid horizontal volume response');
  }
  if (!isRecord(json.algorithm)) {
    throw new Error('Invalid horizontal volume algorithm');
  }
  const chartTimeframeRaw = requiredString(json, 'chartTimeframe');
  if (chartTimeframeRaw !== '1m' && chartTimeframeRaw !== '5m' && chartTimeframeRaw !== '1h') {
    throw new Error('Invalid chartTimeframe');
  }
  const sourceKindRaw = requiredString(json, 'sourceKind');
  if (sourceKindRaw !== 'last_trades' && sourceKindRaw !== 'ohlcv_uniform_approximation') {
    throw new Error('Invalid sourceKind');
  }
  const qualityRaw = requiredString(json, 'quality');
  if (qualityRaw !== 'ok' && qualityRaw !== 'EMPTY' && qualityRaw !== 'DEGENERATE') {
    throw new Error('Invalid quality');
  }
  const tradesSourceRaw = requiredString(json.meta, 'tradesSource');
  if (
    tradesSourceRaw !== 'history_trades' &&
    tradesSourceRaw !== 'last_trades' &&
    tradesSourceRaw !== 'mixed'
  ) {
    throw new Error('Invalid tradesSource');
  }
  const levels: HorizontalVolumeApiResponse['levels'] = [];
  for (const level of json.levels) {
    if (!isRecord(level)) {
      throw new Error('Invalid horizontal volume level');
    }
    levels.push({
      price: requiredString(level, 'price'),
      volume: requiredString(level, 'volume'),
      buyVolume: requiredString(level, 'buyVolume'),
      sellVolume: requiredString(level, 'sellVolume'),
    });
  }
  const tradeCountRaw = json.meta.tradeCount;
  if (typeof tradeCountRaw !== 'number' || !Number.isInteger(tradeCountRaw) || tradeCountRaw < 0) {
    throw new Error('Invalid tradeCount');
  }
  const lastTradesIncludedRaw = json.meta.lastTradesIncluded;
  if (typeof lastTradesIncludedRaw !== 'boolean') {
    throw new Error('Invalid lastTradesIncluded');
  }
  const rowSizeInTicksRaw = json.rowSizeInTicks;
  if (
    typeof rowSizeInTicksRaw !== 'number' ||
    !Number.isInteger(rowSizeInTicksRaw) ||
    rowSizeInTicksRaw < 1
  ) {
    throw new Error('Invalid rowSizeInTicks');
  }
  return {
    instrumentUid: requiredString(json, 'instrumentUid'),
    chartTimeframe: chartTimeframeRaw,
    levels,
    totalVolume: requiredString(json, 'totalVolume'),
    totalBuyVolume: requiredString(json, 'totalBuyVolume'),
    totalSellVolume: requiredString(json, 'totalSellVolume'),
    volumeUnit: requiredString(json, 'volumeUnit'),
    poc: optionalNullableString(json, 'poc'),
    vah: optionalNullableString(json, 'vah'),
    val: optionalNullableString(json, 'val'),
    tickSize: requiredString(json, 'tickSize'),
    rowSizeInTicks: rowSizeInTicksRaw,
    rowSize: requiredString(json, 'rowSize'),
    valueAreaRatio: requiredString(json, 'valueAreaRatio'),
    sourceKind: sourceKindRaw,
    quality: qualityRaw,
    algorithm: {
      id: requiredString(json.algorithm, 'id'),
      version: requiredString(json.algorithm, 'version'),
    },
    meta: {
      requestedFrom: requiredString(json.meta, 'requestedFrom'),
      requestedTo: requiredString(json.meta, 'requestedTo'),
      effectiveFrom: requiredString(json.meta, 'effectiveFrom'),
      effectiveTo: requiredString(json.meta, 'effectiveTo'),
      tradeCount: tradeCountRaw,
      historyTradeDays: parseStringArray(json.meta, 'historyTradeDays'),
      missingDays: parseStringArray(json.meta, 'missingDays'),
      lastTradesIncluded: lastTradesIncludedRaw,
      tradesSource: tradesSourceRaw,
      calculatedAt: requiredString(json.meta, 'calculatedAt'),
    },
  };
}

function parseStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`Expected string[] field ${key}`);
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`Expected string[] field ${key}`);
    }
    result.push(item);
  }
  return result;
}

function optionalNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected string|null field ${key}`);
  }
  return value;
}

function parseFuturesListCategory(value: string): FuturesListCategory {
  if (
    value === 'commodity' ||
    value === 'equity_index' ||
    value === 'currency' ||
    value === 'share'
  ) {
    return value;
  }
  throw new Error('Invalid futures category');
}

function parseFuturesCatalogResponse(json: unknown): FuturesCatalogResponse {
  if (!isRecord(json) || !Array.isArray(json.categories)) {
    throw new Error('Invalid futures catalog response');
  }
  const syncedAt = requiredString(json, 'syncedAt');
  const categories: FuturesCategoryBucket[] = [];
  for (const bucketRaw of json.categories) {
    if (!isRecord(bucketRaw) || !Array.isArray(bucketRaw.families)) {
      throw new Error('Invalid futures category bucket');
    }
    const category = parseFuturesListCategory(requiredString(bucketRaw, 'category'));
    const families: FuturesFamily[] = [];
    for (const familyRaw of bucketRaw.families) {
      families.push(parseFuturesFamily(familyRaw));
    }
    categories.push({ category, families });
  }
  return { syncedAt, categories };
}

function parseFuturesFamily(value: unknown): FuturesFamily {
  if (!isRecord(value) || !Array.isArray(value.contracts)) {
    throw new Error('Invalid futures family');
  }
  const underlyingRaw = value.underlyingAssetName;
  const underlyingAssetName = typeof underlyingRaw === 'string' ? underlyingRaw : null;
  const contracts: FuturesFamilyContract[] = [];
  for (const contractRaw of value.contracts) {
    contracts.push(parseFuturesContract(contractRaw));
  }
  return {
    family: requiredString(value, 'family'),
    underlyingAssetName,
    contracts,
  };
}

function parseFuturesContract(value: unknown): FuturesFamilyContract {
  if (!isRecord(value)) {
    throw new Error('Invalid futures contract');
  }
  const roleRaw = requiredString(value, 'role');
  if (roleRaw !== 'near' && roleRaw !== 'next') {
    throw new Error('Invalid futures contract role');
  }
  const classCodeRaw = value.classCode;
  const classCode = typeof classCodeRaw === 'string' ? classCodeRaw : null;
  return {
    role: roleRaw,
    ticker: requiredString(value, 'ticker'),
    instrumentUid: requiredString(value, 'instrumentUid'),
    name: requiredString(value, 'name'),
    expirationAt: requiredString(value, 'expirationAt'),
    classCode,
    isActive: value.isActive === true,
  };
}

function buildPivotMeta(meta: Record<string, unknown>): FibonacciPivotApiResponse['meta'] {
  const base = {
    requestedFrom: requiredString(meta, 'requestedFrom'),
    requestedTo: requiredString(meta, 'requestedTo'),
    hasGaps: meta.hasGaps === true,
  };
  if (!Array.isArray(meta.missingPeriodIds)) {
    return base;
  }
  return {
    ...base,
    missingPeriodIds: meta.missingPeriodIds.filter((id): id is string => typeof id === 'string'),
  };
}

function parsePivotPeriod(value: unknown): FibonacciPivotApiResponse['periods'][number] {
  if (!isRecord(value)) {
    throw new Error('Invalid pivot period');
  }
  if (!isRecord(value.sourcePeriod) || !isRecord(value.validPeriod) || !isRecord(value.values)) {
    throw new Error('Invalid pivot period shape');
  }
  if (!isRecord(value.algorithm)) {
    throw new Error('Invalid pivot algorithm');
  }
  const sourceTf = requiredString(value.sourcePeriod, 'timeframe');
  if (sourceTf !== '1D' && sourceTf !== '1W') {
    throw new Error('Invalid source timeframe');
  }
  return {
    sourcePeriod: {
      id: requiredString(value.sourcePeriod, 'id'),
      timeframe: sourceTf,
      start: requiredString(value.sourcePeriod, 'start'),
      end: requiredString(value.sourcePeriod, 'end'),
    },
    validPeriod: {
      id: requiredString(value.validPeriod, 'id'),
      start: requiredString(value.validPeriod, 'start'),
      end: requiredString(value.validPeriod, 'end'),
    },
    values: {
      p: requiredString(value.values, 'p'),
      r1: requiredString(value.values, 'r1'),
      r2: requiredString(value.values, 'r2'),
      r3: requiredString(value.values, 'r3'),
      s1: requiredString(value.values, 's1'),
      s2: requiredString(value.values, 's2'),
      s3: requiredString(value.values, 's3'),
    },
    algorithm: {
      id: requiredString(value.algorithm, 'id'),
      version: requiredString(value.algorithm, 'version'),
    },
  };
}
