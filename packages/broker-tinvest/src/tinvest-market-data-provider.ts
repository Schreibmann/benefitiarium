import type {
  GetCandlesInput,
  GetCandlesResult,
  GetTradesInput,
  GetTradesResult,
  InstrumentSpecInput,
  LastPrice,
  MarketDataProvider,
  MarketTrade,
  ProviderInstrument,
} from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime } from '@moex/domain';
import type { HistoryTradesClient } from './history-trades-client.js';
import {
  enumerateUtcDates,
  HISTORY_TRADES_THROTTLE_MS,
  utcTodayString,
} from './history-trades-client.js';
import { mapTinvestCandleToDomain } from './mappers/candles.js';
import {
  mapFutureToInstrumentSpecInput,
  mapFutureToProviderInstrument,
  mapIndicativeToInstrumentSpecInput,
  mapIndicativeToProviderInstrument,
  mapShareToInstrumentSpecInput,
  mapShareToProviderInstrument,
} from './mappers/instruments.js';
import { mapTinvestLastPriceToDomain } from './mappers/market.js';
import type { TinvestTradeRaw } from './raw.js';
import type { InstrumentUidResolver, TinvestReadApi } from './read-api.js';
import { createTtlSingleflightCache } from './ttl-singleflight-cache.js';

export type TinvestMarketDataProviderOptions = {
  api: TinvestReadApi;
  resolver: InstrumentUidResolver;
  isSandbox?: boolean;
  now?: () => Date;
  /** Catalog snapshot TTL (default 15m). */
  catalogTtlMs?: number;
  /**
   * History MD daily trades archives (week/month VP).
   * Required for ranges beyond GetLastTrades’ one-hour window.
   */
  historyTrades?: HistoryTradesClient;
  /** Override archive throttle (default HISTORY_TRADES_THROTTLE_MS). */
  historyTradesThrottleMs?: number;
};

type CatalogCache = {
  instruments: ProviderInstrument[];
  specsByProviderId: Map<string, InstrumentSpecInput>;
};

/**
 * Caches a shares+futures+indicatives snapshot so chart listing can resolve
 * hundreds of specs without N+1 GetFutures/GetShares calls through UID helpers.
 * Concurrent catalog/spec readers share one in-flight load (singleflight).
 */
export function createTinvestMarketDataProvider(
  options: TinvestMarketDataProviderOptions,
): MarketDataProvider {
  const now = options.now ?? (() => new Date());
  const catalogTtlMs = options.catalogTtlMs ?? 15 * 60 * 1000;
  const historyTradesThrottleMs = options.historyTradesThrottleMs ?? HISTORY_TRADES_THROTTLE_MS;
  const catalogCache = createTtlSingleflightCache<CatalogCache>({ ttlMs: catalogTtlMs });
  const dayCache = new Map<string, TinvestTradeRaw[] | null>();

  async function loadCatalogCache(): Promise<CatalogCache> {
    return catalogCache.get(async () => {
      const [shares, futures, indicatives] = await Promise.all([
        options.api.listShares(),
        options.api.listFutures(),
        options.api.listIndicatives(),
      ]);
      const instruments: ProviderInstrument[] = [
        ...shares.map(mapShareToProviderInstrument),
        ...futures.map(mapFutureToProviderInstrument),
        ...indicatives.map(mapIndicativeToProviderInstrument),
      ];
      const specsByProviderId = new Map<string, InstrumentSpecInput>();
      for (const share of shares) {
        specsByProviderId.set(share.uid, mapShareToInstrumentSpecInput(share));
      }
      for (const future of futures) {
        specsByProviderId.set(future.uid, mapFutureToInstrumentSpecInput(future));
      }
      for (const indicative of indicatives) {
        specsByProviderId.set(indicative.uid, mapIndicativeToInstrumentSpecInput(indicative));
      }
      return { instruments, specsByProviderId };
    });
  }

  async function loadHistoryDay(
    providerUid: string,
    date: string,
  ): Promise<TinvestTradeRaw[] | null> {
    const history = options.historyTrades;
    if (history === undefined) {
      return null;
    }
    const cacheKey = `${providerUid}:${date}`;
    if (dayCache.has(cacheKey)) {
      return dayCache.get(cacheKey) ?? null;
    }
    const rows = await history.fetchDayTrades({ instrumentUid: providerUid, date });
    dayCache.set(cacheKey, rows);
    return rows;
  }

  return {
    getInstrumentCatalog: async (): Promise<ProviderInstrument[]> => {
      const cache = await loadCatalogCache();
      return cache.instruments;
    },

    getInstrumentSpec: async (providerInstrumentId: string): Promise<InstrumentSpecInput> => {
      const cache = await loadCatalogCache();
      const cached = cache.specsByProviderId.get(providerInstrumentId);
      if (cached !== undefined) {
        return cached;
      }
      throw new Error(`Instrument not found at T-Invest: ${providerInstrumentId}`);
    },

    getCandles: async (input: GetCandlesInput): Promise<GetCandlesResult> => {
      const providerUid = options.resolver.toProviderUid(input.instrumentId);
      if (providerUid === null) {
        throw new Error(`No T-Invest UID mapping for instrument ${input.instrumentId}`);
      }
      const rawCandles = await options.api.getCandles({
        instrumentUid: providerUid,
        interval: input.interval,
        from: input.from,
        to: input.to,
      });
      return {
        items: rawCandles.map((candle) =>
          mapTinvestCandleToDomain({
            candle,
            instrumentId: input.instrumentId,
            interval: input.interval,
          }),
        ),
      };
    },

    getLastPrices: async (instrumentIds): Promise<LastPrice[]> => {
      const uidByInstrumentId = new Map<string, string>();
      const instrumentIdByUid = new Map<string, string>();
      for (const instrumentId of instrumentIds) {
        const uid = options.resolver.toProviderUid(instrumentId);
        if (uid !== null) {
          uidByInstrumentId.set(instrumentId, uid);
          instrumentIdByUid.set(uid, instrumentId);
        }
      }
      const raw = await options.api.getLastPrices([...uidByInstrumentId.values()]);
      const receivedAt = now().toISOString();
      const prices: LastPrice[] = [];
      for (const item of raw) {
        const mapped = mapTinvestLastPriceToDomain(item, instrumentIdByUid, receivedAt);
        if (mapped) {
          prices.push(mapped);
        }
      }
      return prices;
    },

    getTrades: async (input: GetTradesInput): Promise<GetTradesResult> => {
      const providerUid = options.resolver.toProviderUid(input.instrumentId);
      if (providerUid === null) {
        throw new Error(`No T-Invest UID mapping for instrument ${input.instrumentId}`);
      }
      if (!(input.from < input.to)) {
        throw new Error('getTrades: from must be less than to');
      }

      const clock = now();
      const today = utcTodayString(clock);
      const dates = enumerateUtcDates(input.from, input.to);
      const historyTradeDays: string[] = [];
      const missingDays: string[] = [];
      const rawTrades: TinvestTradeRaw[] = [];

      let archiveRequests = 0;
      for (const date of dates) {
        if (date >= today) {
          // Current UTC day is not in nightly archives yet.
          continue;
        }
        if (options.historyTrades === undefined) {
          missingDays.push(date);
          continue;
        }
        if (archiveRequests > 0) {
          await sleep(historyTradesThrottleMs);
        }
        archiveRequests += 1;
        const dayRows = await loadHistoryDay(providerUid, date);
        if (dayRows === null) {
          missingDays.push(date);
          continue;
        }
        historyTradeDays.push(date);
        for (const trade of dayRows) {
          const eventMs = Date.parse(trade.time);
          if (!Number.isFinite(eventMs)) {
            continue;
          }
          if (eventMs < input.from.getTime() || eventMs >= input.to.getTime()) {
            continue;
          }
          rawTrades.push(trade);
        }
      }

      let lastTradesIncluded = false;
      if (dates.includes(today)) {
        const liveFrom = new Date(
          Math.max(input.from.getTime(), Date.parse(`${today}T00:00:00.000Z`)),
        );
        const liveTo = input.to.getTime() > clock.getTime() ? clock : input.to;
        if (liveFrom < liveTo) {
          const live = await options.api.getLastTrades({
            instrumentUid: providerUid,
            from: liveFrom,
            to: liveTo,
          });
          if (live.length > 0) {
            lastTradesIncluded = true;
            rawTrades.push(...live);
          }
        }
      }

      const items: MarketTrade[] = rawTrades.map((trade) => ({
        instrumentId: input.instrumentId,
        provider: 't-invest',
        price: parseDecimalString(trade.price),
        quantity: parseDecimalString(trade.quantity),
        direction: trade.direction,
        eventTime: parseIsoDateTime(trade.time),
      }));

      let source: GetTradesResult['source'] = 'history_trades';
      if (historyTradeDays.length === 0 && lastTradesIncluded) {
        source = 'last_trades';
      } else if (historyTradeDays.length > 0 && lastTradesIncluded) {
        source = 'mixed';
      } else if (historyTradeDays.length === 0 && !lastTradesIncluded) {
        source = options.historyTrades === undefined ? 'last_trades' : 'history_trades';
      }

      return {
        items,
        effectiveFrom: parseIsoDateTime(input.from.toISOString()),
        effectiveTo: parseIsoDateTime(input.to.toISOString()),
        historyTradeDays,
        missingDays,
        lastTradesIncluded,
        source,
      };
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
