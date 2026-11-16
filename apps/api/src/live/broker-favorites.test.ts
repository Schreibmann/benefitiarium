import type { TinvestFavoriteRaw, TinvestReadApi } from '@moex/broker-tinvest';
import { describe, expect, it } from 'vitest';
import { createBrokerFavoritesRepository } from './broker-favorites.js';

type FutureRow = Awaited<ReturnType<TinvestReadApi['listFutures']>>[number];

function favorite(
  partial: Partial<TinvestFavoriteRaw> & Pick<TinvestFavoriteRaw, 'uid' | 'ticker'>,
): TinvestFavoriteRaw {
  return {
    figi: null,
    name: null,
    classCode: null,
    instrumentType: null,
    apiTradeAvailableFlag: true,
    ...partial,
  };
}

function future(uid: string, ticker: string): FutureRow {
  return {
    uid,
    figi: null,
    ticker,
    classCode: 'SPBFUT',
    name: ticker,
    lot: 1,
    currency: 'rub',
    minPriceIncrement: '1',
    minPriceIncrementAmount: null,
    basicAsset: null,
    basicAssetPositionUid: null,
    assetType: null,
    sector: null,
    expirationDate: null,
    futuresType: null,
    first1minCandleDate: null,
    first1dayCandleDate: null,
    initialMarginOnBuy: null,
    apiTradeAvailableFlag: true,
  };
}

function createApi(input: {
  favorites: TinvestFavoriteRaw[];
  futures: FutureRow[];
}): TinvestReadApi {
  return {
    listShares: async () => [],
    listFutures: async () => input.futures,
    listIndicatives: async () => [],
    listFavorites: async () => input.favorites,
    getShareByUid: async () => null,
    getFutureByUid: async () => null,
    getIndicativeByUid: async () => null,
    getCandles: async () => [],
    getLastPrices: async () => [],
    getLastTrades: async () => [],
    getTechAnalysis: async () => [],
    listAccounts: async () => [],
    getPositions: async () => [],
    getOrders: async () => [],
    getOrderById: async () => null,
  };
}

describe('createBrokerFavoritesRepository', () => {
  it('keeps only futures from GetFavorites (by type or futures catalog uid)', async () => {
    const repo = createBrokerFavoritesRepository(
      createApi({
        favorites: [
          favorite({ uid: 'share-1', ticker: 'SBER', instrumentType: 'share' }),
          favorite({ uid: 'fut-1', ticker: 'BRH6', instrumentType: 'futures' }),
          favorite({ uid: 'fut-2', ticker: 'MXH6', instrumentType: null }),
          favorite({ uid: 'bond-1', ticker: 'SU26238', instrumentType: 'bond' }),
        ],
        futures: [future('fut-1', 'BRH6'), future('fut-2', 'MXH6')],
      }),
    );

    const rows = await repo.list();
    expect(rows.map((row) => row.ticker)).toEqual(['BRH6', 'MXH6']);
    expect(await repo.get('share-1')).toBeNull();
    expect((await repo.get('fut-1'))?.ticker).toBe('BRH6');
  });
});
