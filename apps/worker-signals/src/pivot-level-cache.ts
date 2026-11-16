import type { MarketDataProvider } from '@moex/contracts';
import { parseInstrumentId } from '@moex/domain';
import {
  type ChartTimeframe,
  FIBONACCI_PIVOT_TIMEFRAME_MAP,
  generateHistoricalPivots,
  referencePeriodsFromCandles,
  tradingPeriodsFromReference,
} from '@moex/indicators';
import { type LevelSet, levelsFromPivotPeriod, type SignalTimeframe } from '@moex/signal-triggers';

export type PivotLevelCache = {
  getLevelSet: (input: {
    instrumentUid: string;
    timeframe: SignalTimeframe;
    now?: Date;
  }) => Promise<LevelSet | null>;
  clear: () => void;
};

type CacheEntry = {
  levelSet: LevelSet;
  epochKey: string;
  expiresAtMs: number;
};

function moscowEpochKey(now: Date, referenceTimeframe: '1d' | '1w'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  if (referenceTimeframe === '1d') {
    return `1d:${year}-${month}-${day}`;
  }
  const utc = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const weekStart = new Date(utc);
  const weekday = weekStart.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);
  return `1w:${weekStart.toISOString().slice(0, 10)}`;
}

export function createPivotLevelCache(input: {
  marketData: MarketDataProvider;
  ttlMs?: number;
  now?: () => number;
}): PivotLevelCache {
  const ttlMs = input.ttlMs ?? 5 * 60 * 1000;
  const nowMs = input.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<LevelSet | null>>();

  async function load(
    instrumentUid: string,
    timeframe: SignalTimeframe,
    at: Date,
  ): Promise<LevelSet | null> {
    const chartTimeframe: ChartTimeframe = timeframe;
    const referenceTimeframe = FIBONACCI_PIVOT_TIMEFRAME_MAP[chartTimeframe];
    const lookbackMs =
      referenceTimeframe === '1d' ? 10 * 24 * 60 * 60 * 1000 : 21 * 24 * 60 * 60 * 1000;
    const from = new Date(at.getTime() - lookbackMs);
    const instrumentId = parseInstrumentId(instrumentUid);
    const candles = await input.marketData.getCandles({
      instrumentId,
      interval: referenceTimeframe,
      from,
      to: at,
    });
    const sources = referencePeriodsFromCandles({
      instrumentUid,
      timeframe: referenceTimeframe,
      candles: candles.items,
    });
    if (sources.length === 0) {
      return null;
    }
    const targets = tradingPeriodsFromReference(sources, { openPeriodEnd: at });
    const generated = generateHistoricalPivots({
      instrumentUid,
      chartTimeframe,
      sourcePeriods: sources,
      targetPeriods: targets,
      now: () => at,
    });
    const openPeriod = generated.periods.find((period) => period.validPeriodId === 'valid:open');
    const period = openPeriod ?? generated.periods[generated.periods.length - 1];
    if (period === undefined) {
      return null;
    }
    return levelsFromPivotPeriod(period);
  }

  return {
    async getLevelSet({ instrumentUid, timeframe, now }) {
      const at = now ?? new Date(nowMs());
      const referenceTimeframe = FIBONACCI_PIVOT_TIMEFRAME_MAP[timeframe];
      const epochKey = moscowEpochKey(at, referenceTimeframe);
      const cacheKey = `${instrumentUid}|${timeframe}`;
      const cached = cache.get(cacheKey);
      if (cached !== undefined && cached.epochKey === epochKey && cached.expiresAtMs > nowMs()) {
        return cached.levelSet;
      }

      const existing = inflight.get(cacheKey);
      if (existing !== undefined) {
        return existing;
      }

      const promise = (async () => {
        try {
          const levelSet = await load(instrumentUid, timeframe, at);
          if (levelSet !== null) {
            cache.set(cacheKey, {
              levelSet,
              epochKey,
              expiresAtMs: nowMs() + ttlMs,
            });
          }
          return levelSet;
        } finally {
          inflight.delete(cacheKey);
        }
      })();
      inflight.set(cacheKey, promise);
      return promise;
    },
    clear() {
      cache.clear();
      inflight.clear();
    },
  };
}
