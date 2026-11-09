import type {
  GetCandlesInput,
  GetCandlesResult,
  InstrumentSpecInput,
  LastPrice,
  MarketDataProvider,
  ProviderInstrument,
} from '@moex/contracts';
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
import type { InstrumentUidResolver, TinvestReadApi } from './read-api.js';
import { createTtlSingleflightCache } from './ttl-singleflight-cache.js';

export type TinvestMarketDataProviderOptions = {
  api: TinvestReadApi;
  resolver: InstrumentUidResolver;
  isSandbox?: boolean;
  now?: () => Date;
  /** Catalog snapshot TTL (default 15m). */
  catalogTtlMs?: number;
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
  const catalogCache = createTtlSingleflightCache<CatalogCache>({ ttlMs: catalogTtlMs });

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
  };
}
