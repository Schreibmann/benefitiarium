import { describe, expect, it, vi } from 'vitest';
import type { TinvestFavoriteInstrumentRaw } from '../raw.js';
import {
  FavoritesCandleStreamSync,
  favoritesToProviderSubscriptionKeys,
} from './favorites-candle-stream-sync.js';
import type { ProviderSubscriptionKey } from './provider-subscription-key.js';

const sber: TinvestFavoriteInstrumentRaw = {
  uid: 'uid-sber',
  figi: 'BBG004730N88',
  ticker: 'SBER',
  classCode: 'TQBR',
  isin: 'RU0009029540',
  name: 'Sber',
  instrumentType: 'share',
  instrumentKind: 'SHARE',
  otcFlag: false,
  apiTradeAvailableFlag: true,
};

const gazpBlocked: TinvestFavoriteInstrumentRaw = {
  uid: 'uid-gazp',
  figi: 'BBG004730RP0',
  ticker: 'GAZP',
  classCode: 'TQBR',
  isin: null,
  name: 'Gazp',
  instrumentType: 'share',
  instrumentKind: 'SHARE',
  otcFlag: false,
  apiTradeAvailableFlag: false,
};

describe('favoritesToProviderSubscriptionKeys', () => {
  it('maps tradeable favorites to EXCHANGE keys and skips blocked', () => {
    const keys = favoritesToProviderSubscriptionKeys({
      favorites: [sber, gazpBlocked],
      intervals: ['1m'],
      waitingClose: true,
    });
    expect(keys).toEqual([
      {
        instrumentUid: 'uid-sber',
        interval: '1m',
        candleSource: 'EXCHANGE',
        waitingClose: true,
      },
    ]);
  });

  it('emits one key per interval', () => {
    const keys = favoritesToProviderSubscriptionKeys({
      favorites: [sber],
      intervals: ['5m', '1h'],
      waitingClose: true,
    });
    expect(keys).toHaveLength(2);
    expect(keys.map((key) => key.interval).sort()).toEqual(['1h', '5m']);
  });

  it('dedupes identical instrument ids', () => {
    const keys = favoritesToProviderSubscriptionKeys({
      favorites: [sber, { ...sber, figi: 'other' }],
      intervals: ['5m'],
      waitingClose: false,
    });
    expect(keys).toHaveLength(1);
  });
});

describe('FavoritesCandleStreamSync', () => {
  it('syncOnce fetches favorites and pushes desired keys to the stream manager', async () => {
    const synced: ProviderSubscriptionKey[][] = [];
    const fetchFavorites = vi.fn(async () => [sber, gazpBlocked]);
    const sync = new FavoritesCandleStreamSync({
      fetchFavorites,
      streamManager: {
        syncDesiredSubscriptions: async (keys) => {
          synced.push([...keys]);
        },
      },
      intervals: ['1m'],
      waitingClose: true,
    });

    const result = await sync.syncOnce();
    expect(fetchFavorites).toHaveBeenCalledOnce();
    expect(result.favoriteCount).toBe(2);
    expect(result.subscribedCount).toBe(1);
    expect(synced).toEqual([
      [
        {
          instrumentUid: 'uid-sber',
          interval: '1m',
          candleSource: 'EXCHANGE',
          waitingClose: true,
        },
      ],
    ]);
    expect(sync.getLastKeys()).toEqual(result.keys);
  });

  it('supports legacy single interval option', async () => {
    const synced: ProviderSubscriptionKey[][] = [];
    const sync = new FavoritesCandleStreamSync({
      fetchFavorites: async () => [sber],
      streamManager: {
        syncDesiredSubscriptions: async (keys) => {
          synced.push([...keys]);
        },
      },
      interval: '5m',
    });
    await sync.syncOnce();
    expect(synced[0]?.[0]?.interval).toBe('5m');
  });

  it('passes groupId to fetchFavorites when configured', async () => {
    const fetchFavorites = vi.fn(async () => [] as TinvestFavoriteInstrumentRaw[]);
    const sync = new FavoritesCandleStreamSync({
      fetchFavorites,
      streamManager: {
        syncDesiredSubscriptions: async () => undefined,
      },
      intervals: ['5m'],
      groupId: 'group-1',
    });
    await sync.syncOnce();
    expect(fetchFavorites).toHaveBeenCalledWith({ groupId: 'group-1' });
  });

  it('polls until stop when pollIntervalMs is set', async () => {
    let resolveSecondFetch: (() => void) | undefined;
    const secondFetchSeen = new Promise<void>((resolve) => {
      resolveSecondFetch = resolve;
    });
    let ticks = 0;
    const fetchFavorites = vi.fn(async () => {
      ticks += 1;
      if (ticks === 2) {
        resolveSecondFetch?.();
      }
      return [sber];
    });
    const waiters: Array<() => void> = [];
    const sync = new FavoritesCandleStreamSync({
      fetchFavorites,
      streamManager: {
        syncDesiredSubscriptions: async () => undefined,
      },
      intervals: ['1m'],
      pollIntervalMs: 10,
      sleep: () =>
        new Promise((resolve) => {
          waiters.push(resolve);
        }),
    });

    await sync.start();
    expect(fetchFavorites).toHaveBeenCalledTimes(1);
    expect(sync.isRunning()).toBe(true);

    await Promise.resolve();
    const firstWaiter = waiters.shift();
    expect(firstWaiter).toBeDefined();
    if (firstWaiter !== undefined) {
      firstWaiter();
    }
    await secondFetchSeen;
    expect(ticks).toBe(2);

    await sync.stop();
    expect(sync.isRunning()).toBe(false);
  });
});
