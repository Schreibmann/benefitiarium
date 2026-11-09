import type { MarketDataProvider, ProviderInstrument } from '@moex/contracts';
import type { Candle, CandleInterval, InstrumentId } from '@moex/domain';
import { parseInstrumentId } from '@moex/domain';
import {
  type ChartTimeframe,
  FIBONACCI_PIVOT_ALGORITHM_ID,
  FIBONACCI_PIVOT_ALGORITHM_VERSION,
  FIBONACCI_PIVOT_COEFFICIENTS,
  FIBONACCI_PIVOT_TIMEFRAME_MAP,
  generateHistoricalPivots,
  type ReferenceTimeframe,
} from '@moex/indicators';
import { referencePeriodsFromCandles, tradingPeriodsFromReference } from './reference-periods.js';

export type FibonacciPivotPeriodDto = {
  sourcePeriod: {
    id: string;
    timeframe: '1D' | '1W';
    start: string;
    end: string;
    high: string;
    low: string;
    close: string;
    provider: string;
    candleSource: string;
    aggregationMethod: 'NATIVE' | 'AGGREGATED';
    sourceHash: string;
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
    id: typeof FIBONACCI_PIVOT_ALGORITHM_ID;
    version: string;
    coefficients: [
      typeof FIBONACCI_PIVOT_COEFFICIENTS.first,
      typeof FIBONACCI_PIVOT_COEFFICIENTS.second,
      typeof FIBONACCI_PIVOT_COEFFICIENTS.third,
    ];
  };
  calculatedAt: string;
};

export type FibonacciPivotResponseDto = {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  referenceTimeframe: '1D' | '1W';
  periods: FibonacciPivotPeriodDto[];
  meta: {
    requestedFrom: string;
    requestedTo: string;
    hasGaps: boolean;
    missingPeriodIds?: string[];
  };
};

export type ChartMarketDataDeps = {
  marketData: MarketDataProvider;
};

const CHART_INTERVALS = new Set<CandleInterval>(['5m', '1h']);

export function parseChartTimeframe(value: string): ChartTimeframe {
  if (value === '5m' || value === '1h') {
    return value;
  }
  throw new Error('timeframe must be 5m or 1h');
}

function toApiReferenceTimeframe(value: ReferenceTimeframe): '1D' | '1W' {
  return value === '1d' ? '1D' : '1W';
}

export async function lookupInstrumentByTicker(
  deps: ChartMarketDataDeps,
  ticker: string,
): Promise<ProviderInstrument | null> {
  const normalized = ticker.trim().toUpperCase();
  if (normalized.length === 0) {
    return null;
  }
  const catalog = await deps.marketData.getInstrumentCatalog();
  return (
    catalog.find((item) => item.ticker.toUpperCase() === normalized && item.isActive) ??
    catalog.find((item) => item.ticker.toUpperCase() === normalized) ??
    null
  );
}

export async function getChartCandles(
  deps: ChartMarketDataDeps,
  input: {
    instrumentUid: string;
    interval: CandleInterval;
    from: Date;
    to: Date;
  },
): Promise<Candle[]> {
  if (!CHART_INTERVALS.has(input.interval)) {
    throw new Error('interval must be 5m or 1h');
  }
  const instrumentId = parseInstrumentId(input.instrumentUid);
  const result = await deps.marketData.getCandles({
    instrumentId,
    interval: input.interval,
    from: input.from,
    to: input.to,
  });
  return result.items;
}

export async function getFibonacciPivots(
  deps: ChartMarketDataDeps,
  input: {
    instrumentUid: string;
    chartTimeframe: ChartTimeframe;
    from: Date;
    to: Date;
  },
): Promise<FibonacciPivotResponseDto> {
  const referenceTimeframe = FIBONACCI_PIVOT_TIMEFRAME_MAP[input.chartTimeframe];
  const instrumentId: InstrumentId = parseInstrumentId(input.instrumentUid);

  // Load one extra reference period before `from` so the first target can be calculated.
  const lookbackMs =
    referenceTimeframe === '1d' ? 10 * 24 * 60 * 60 * 1000 : 21 * 24 * 60 * 60 * 1000;
  const sourceFrom = new Date(input.from.getTime() - lookbackMs);

  const sourceCandles = await deps.marketData.getCandles({
    instrumentId,
    interval: referenceTimeframe,
    from: sourceFrom,
    to: input.to,
  });

  const sources = referencePeriodsFromCandles({
    instrumentUid: input.instrumentUid,
    timeframe: referenceTimeframe,
    candles: sourceCandles.items,
  });
  const targets = tradingPeriodsFromReference(sources).filter(
    (period) => period.start < input.to && period.end > input.from,
  );

  const generated = generateHistoricalPivots({
    instrumentUid: input.instrumentUid,
    chartTimeframe: input.chartTimeframe,
    sourcePeriods: sources,
    targetPeriods: targets,
  });

  const periods: FibonacciPivotPeriodDto[] = generated.periods.map((period) => {
    const source = sources.find((row) => row.periodId === period.sourcePeriodId);
    return {
      sourcePeriod: {
        id: period.sourcePeriodId,
        timeframe: toApiReferenceTimeframe(period.referenceTimeframe),
        start: period.sourcePeriodStart.toISOString(),
        end: period.sourcePeriodEnd.toISOString(),
        high: period.sourceOHLC.high,
        low: period.sourceOHLC.low,
        close: period.sourceOHLC.close,
        provider: source?.source.provider ?? 't-invest',
        candleSource: source?.source.candleSource ?? 'EXCHANGE',
        aggregationMethod: source?.source.aggregationMethod ?? 'NATIVE',
        sourceHash: period.sourceHash,
      },
      validPeriod: {
        id: period.validPeriodId,
        start: period.validFrom.toISOString(),
        end: period.validTo.toISOString(),
      },
      values: {
        p: period.levels.p,
        r1: period.levels.r1,
        r2: period.levels.r2,
        r3: period.levels.r3,
        s1: period.levels.s1,
        s2: period.levels.s2,
        s3: period.levels.s3,
      },
      algorithm: {
        id: FIBONACCI_PIVOT_ALGORITHM_ID,
        version: FIBONACCI_PIVOT_ALGORITHM_VERSION,
        coefficients: [
          FIBONACCI_PIVOT_COEFFICIENTS.first,
          FIBONACCI_PIVOT_COEFFICIENTS.second,
          FIBONACCI_PIVOT_COEFFICIENTS.third,
        ],
      },
      calculatedAt: period.calculatedAt.toISOString(),
    };
  });

  const meta: FibonacciPivotResponseDto['meta'] = {
    requestedFrom: input.from.toISOString(),
    requestedTo: input.to.toISOString(),
    hasGaps: generated.missingPeriodIds.length > 0,
  };
  if (generated.missingPeriodIds.length > 0) {
    meta.missingPeriodIds = generated.missingPeriodIds;
  }

  return {
    instrumentUid: input.instrumentUid,
    chartTimeframe: input.chartTimeframe,
    referenceTimeframe: toApiReferenceTimeframe(referenceTimeframe),
    periods,
    meta,
  };
}
