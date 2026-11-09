import type {
  CandleRow,
  ChartTimeframe,
  FibonacciPivotApiResponse,
  InstrumentLookup,
} from './types.js';

export type ChartApiClient = {
  lookupByTicker: (ticker: string) => Promise<InstrumentLookup>;
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

  async function request(path: string): Promise<unknown> {
    const response = await fetchImpl(`${baseUrl}${path}`);
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
      if (chartTimeframeRaw !== '5m' && chartTimeframeRaw !== '1h') {
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
