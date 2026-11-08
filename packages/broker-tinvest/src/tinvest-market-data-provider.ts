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

export type TinvestMarketDataProviderOptions = {
  api: TinvestReadApi;
  resolver: InstrumentUidResolver;
  isSandbox?: boolean;
  now?: () => Date;
};

export function createTinvestMarketDataProvider(
  options: TinvestMarketDataProviderOptions,
): MarketDataProvider {
  const now = options.now ?? (() => new Date());

  return {
    getInstrumentCatalog: async (): Promise<ProviderInstrument[]> => {
      const [shares, futures, indicatives] = await Promise.all([
        options.api.listShares(),
        options.api.listFutures(),
        options.api.listIndicatives(),
      ]);
      return [
        ...shares.map(mapShareToProviderInstrument),
        ...futures.map(mapFutureToProviderInstrument),
        ...indicatives.map(mapIndicativeToProviderInstrument),
      ];
    },

    getInstrumentSpec: async (providerInstrumentId: string): Promise<InstrumentSpecInput> => {
      const share = await options.api.getShareByUid(providerInstrumentId);
      if (share) {
        return mapShareToInstrumentSpecInput(share);
      }
      const future = await options.api.getFutureByUid(providerInstrumentId);
      if (future) {
        return mapFutureToInstrumentSpecInput(future);
      }
      const indicative = await options.api.getIndicativeByUid(providerInstrumentId);
      if (indicative) {
        return mapIndicativeToInstrumentSpecInput(indicative);
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
