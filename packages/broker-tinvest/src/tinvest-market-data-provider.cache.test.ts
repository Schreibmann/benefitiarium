import { describe, expect, it } from 'vitest';
import type { TinvestFutureRaw, TinvestIndicativeRaw, TinvestShareRaw } from './raw.js';
import type { TinvestReadApi } from './read-api.js';
import { createIdentityInstrumentUidResolver } from './sdk-read-api.js';
import { createTinvestMarketDataProvider } from './tinvest-market-data-provider.js';

function future(
  partial: Partial<TinvestFutureRaw> & Pick<TinvestFutureRaw, 'uid' | 'ticker'>,
): TinvestFutureRaw {
  return {
    figi: null,
    name: partial.ticker,
    classCode: 'SPBFUT',
    currency: 'rub',
    lot: 1,
    minPriceIncrement: '0.01',
    minPriceIncrementAmount: null,
    assetType: 'TYPE_COMMODITY',
    sector: 'commodity',
    basicAsset: 'Brent',
    basicAssetPositionUid: null,
    expirationDate: '2026-04-16T00:00:00.000Z',
    first1minCandleDate: null,
    first1dayCandleDate: null,
    initialMarginOnBuy: null,
    futuresType: null,
    apiTradeAvailableFlag: true,
    ...partial,
  };
}

describe('createTinvestMarketDataProvider catalog/spec caching', () => {
  it('avoids N+1 listFutures/listShares when resolving specs after catalog (SDK-style UID lookup)', async () => {
    let listFuturesCalls = 0;
    let listSharesCalls = 0;
    const futures = [
      future({ uid: 'uid-1', ticker: 'BRH6', expirationDate: '2026-02-16T00:00:00.000Z' }),
      future({ uid: 'uid-2', ticker: 'BRJ6', expirationDate: '2026-04-16T00:00:00.000Z' }),
    ];

    const api: TinvestReadApi = {
      listShares: async () => {
        listSharesCalls += 1;
        return [] as TinvestShareRaw[];
      },
      listFutures: async () => {
        listFuturesCalls += 1;
        return futures;
      },
      listIndicatives: async () => [] as TinvestIndicativeRaw[],
      // Mirror createSdkTinvestReadApi: UID lookup re-lists the whole catalog.
      getShareByUid: async (uid) => {
        const rows = await api.listShares();
        return rows.find((row) => row.uid === uid) ?? null;
      },
      getFutureByUid: async (uid) => {
        const rows = await api.listFutures();
        return rows.find((row) => row.uid === uid) ?? null;
      },
      getIndicativeByUid: async (uid) => {
        const rows = await api.listIndicatives();
        return rows.find((row) => row.uid === uid) ?? null;
      },
      getCandles: async () => [],
      getLastPrices: async () => [],
      getTechAnalysis: async () => [],
      listAccounts: async () => {
        throw new Error('unused');
      },
      getPositions: async () => {
        throw new Error('unused');
      },
      getOrders: async () => {
        throw new Error('unused');
      },
      getOrderById: async () => null,
    };

    const provider = createTinvestMarketDataProvider({
      api,
      resolver: createIdentityInstrumentUidResolver(),
    });

    const catalog = await provider.getInstrumentCatalog();
    expect(catalog.filter((row) => row.assetType === 'future')).toHaveLength(2);
    expect(listFuturesCalls).toBe(1);

    await provider.getInstrumentSpec('uid-1');
    await provider.getInstrumentSpec('uid-2');
    expect(listFuturesCalls).toBe(1);
    expect(listSharesCalls).toBe(1);
  });

  it('coalesces concurrent catalog readers into one listFutures call', async () => {
    let listFuturesCalls = 0;
    const futures = [
      future({ uid: 'uid-1', ticker: 'BRH6', expirationDate: '2026-02-16T00:00:00.000Z' }),
    ];
    const api: TinvestReadApi = {
      listShares: async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return [];
      },
      listFutures: async () => {
        listFuturesCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return futures;
      },
      listIndicatives: async () => [],
      getShareByUid: async () => null,
      getFutureByUid: async () => null,
      getIndicativeByUid: async () => null,
      getCandles: async () => [],
      getLastPrices: async () => [],
      getTechAnalysis: async () => [],
      listAccounts: async () => {
        throw new Error('unused');
      },
      getPositions: async () => {
        throw new Error('unused');
      },
      getOrders: async () => {
        throw new Error('unused');
      },
      getOrderById: async () => null,
    };

    const provider = createTinvestMarketDataProvider({
      api,
      resolver: createIdentityInstrumentUidResolver(),
    });

    await Promise.all([
      provider.getInstrumentCatalog(),
      provider.getInstrumentCatalog(),
      provider.getInstrumentSpec('uid-1'),
    ]);
    expect(listFuturesCalls).toBe(1);
  });
});
