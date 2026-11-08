import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  TinvestAccountRaw,
  TinvestCandleRaw,
  TinvestFutureRaw,
  TinvestIndicativeRaw,
  TinvestLastPriceRaw,
  TinvestOrderRaw,
  TinvestPositionRaw,
  TinvestShareRaw,
} from './raw.js';
import type { TinvestReadApi } from './read-api.js';

function loadJson(name: string): unknown {
  const here = dirname(fileURLToPath(import.meta.url));
  return JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function readShare(value: unknown): TinvestShareRaw {
  if (!isObject(value)) {
    throw new Error('share fixture invalid');
  }
  return {
    uid: String(value.uid),
    figi: optionalString(value.figi),
    ticker: String(value.ticker),
    name: String(value.name),
    classCode: String(value.classCode),
    currency: String(value.currency),
    lot: Number(value.lot),
    minPriceIncrement: String(value.minPriceIncrement),
    apiTradeAvailableFlag: Boolean(value.apiTradeAvailableFlag),
    forQualInvestorFlag: Boolean(value.forQualInvestorFlag),
    first1dayCandleDate: optionalString(value.first1dayCandleDate),
    first1minCandleDate: optionalString(value.first1minCandleDate),
    exchange: optionalString(value.exchange),
  };
}

function readFuture(value: unknown): TinvestFutureRaw {
  if (!isObject(value)) {
    throw new Error('future fixture invalid');
  }
  return {
    uid: String(value.uid),
    figi: optionalString(value.figi),
    ticker: String(value.ticker),
    name: String(value.name),
    classCode: String(value.classCode),
    currency: String(value.currency),
    lot: Number(value.lot),
    minPriceIncrement: String(value.minPriceIncrement),
    minPriceIncrementAmount: optionalString(value.minPriceIncrementAmount),
    assetType: optionalString(value.assetType),
    basicAsset: optionalString(value.basicAsset),
    basicAssetPositionUid: optionalString(value.basicAssetPositionUid),
    expirationDate: optionalString(value.expirationDate),
    first1minCandleDate: optionalString(value.first1minCandleDate),
    first1dayCandleDate: optionalString(value.first1dayCandleDate),
    initialMarginOnBuy: optionalString(value.initialMarginOnBuy),
    futuresType: optionalString(value.futuresType),
    apiTradeAvailableFlag: Boolean(value.apiTradeAvailableFlag),
  };
}

function readIndicative(value: unknown): TinvestIndicativeRaw {
  if (!isObject(value)) {
    throw new Error('indicative fixture invalid');
  }
  return {
    uid: String(value.uid),
    figi: optionalString(value.figi),
    ticker: String(value.ticker),
    name: String(value.name),
    classCode: String(value.classCode),
    currency: String(value.currency),
    exchange: optionalString(value.exchange),
    buyAvailableFlag: Boolean(value.buyAvailableFlag),
    sellAvailableFlag: Boolean(value.sellAvailableFlag),
  };
}

export function createFixtureTinvestReadApi(): TinvestReadApi {
  const share = readShare(loadJson('share.json'));
  const futuresFixture = loadJson('futures.json');
  const indicativesFixture = loadJson('indicatives.json');
  const candlesFixture = loadJson('candles.json');
  const lastPriceFixture = loadJson('last-price.json');
  const accountsFixture = loadJson('accounts.json');
  const positionsFixture = loadJson('positions.json');
  const ordersFixture = loadJson('orders.json');

  if (!isObject(futuresFixture) || !Array.isArray(futuresFixture.futures)) {
    throw new Error('futures fixture invalid');
  }
  const futures = futuresFixture.futures.map(readFuture);

  if (!isObject(indicativesFixture) || !Array.isArray(indicativesFixture.indicatives)) {
    throw new Error('indicatives fixture invalid');
  }
  const indicatives = indicativesFixture.indicatives.map(readIndicative);

  if (!isObject(candlesFixture) || !Array.isArray(candlesFixture.candles)) {
    throw new Error('candles fixture invalid');
  }
  const candles = candlesFixture.candles.map((item): TinvestCandleRaw => {
    if (!isObject(item)) {
      throw new Error('candle row invalid');
    }
    return {
      time: String(item.time),
      open: String(item.open),
      high: String(item.high),
      low: String(item.low),
      close: String(item.close),
      volume: String(item.volume),
      isComplete: Boolean(item.isComplete),
    };
  });

  if (!isObject(lastPriceFixture)) {
    throw new Error('last-price fixture invalid');
  }
  const lastPrice: TinvestLastPriceRaw = {
    instrumentUid: String(lastPriceFixture.instrumentUid),
    price: String(lastPriceFixture.price),
    time: String(lastPriceFixture.time),
  };

  if (!isObject(accountsFixture) || !Array.isArray(accountsFixture.accounts)) {
    throw new Error('accounts fixture invalid');
  }
  const accounts: TinvestAccountRaw[] = accountsFixture.accounts.map((item) => {
    if (!isObject(item)) {
      throw new Error('account row invalid');
    }
    return {
      id: String(item.id),
      type: optionalString(item.type),
      name: optionalString(item.name),
      status: optionalString(item.status),
    };
  });

  if (!isObject(positionsFixture) || !Array.isArray(positionsFixture.positions)) {
    throw new Error('positions fixture invalid');
  }
  const positions: TinvestPositionRaw[] = positionsFixture.positions.map((item) => {
    if (!isObject(item)) {
      throw new Error('position row invalid');
    }
    return {
      instrumentUid: String(item.instrumentUid),
      figi: optionalString(item.figi),
      quantity: String(item.quantity),
      averagePositionPrice: optionalString(item.averagePositionPrice),
      currentPrice: optionalString(item.currentPrice),
      currency: optionalString(item.currency),
    };
  });

  if (!isObject(ordersFixture) || !Array.isArray(ordersFixture.orders)) {
    throw new Error('orders fixture invalid');
  }
  const orders: TinvestOrderRaw[] = ordersFixture.orders.map((item) => {
    if (!isObject(item)) {
      throw new Error('order row invalid');
    }
    return {
      orderId: String(item.orderId),
      orderRequestId: optionalString(item.orderRequestId),
      instrumentUid: String(item.instrumentUid),
      direction: String(item.direction),
      orderType: String(item.orderType),
      lotsRequested: Number(item.lotsRequested),
      lotsExecuted: Number(item.lotsExecuted),
      initialSecurityPrice: optionalString(item.initialSecurityPrice),
      executionReportStatus: String(item.executionReportStatus),
      orderDate: optionalString(item.orderDate),
    };
  });

  return {
    listShares: async () => [share],
    listFutures: async () => futures,
    listIndicatives: async () => indicatives,
    getShareByUid: async (uid) => (uid === share.uid ? share : null),
    getFutureByUid: async (uid) => futures.find((item) => item.uid === uid) ?? null,
    getIndicativeByUid: async (uid) => indicatives.find((item) => item.uid === uid) ?? null,
    getCandles: async () => candles,
    getLastPrices: async (uids) => (uids.includes(lastPrice.instrumentUid) ? [lastPrice] : []),
    listAccounts: async () => accounts,
    getPositions: async () => positions,
    getOrders: async () => orders,
    getOrderById: async (_accountId, brokerOrderId) =>
      orders.find((order) => order.orderId === brokerOrderId) ?? null,
  };
}
