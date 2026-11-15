import { loadEnv } from '@moex/config';
import type { InstrumentSpecInput, MarketDataProvider, ProviderInstrument } from '@moex/contracts';
import { parseCandle, parseDecimalString, parseInstrumentId, parseIsoDateTime } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { createApp } from '../create-app.js';

const instrumentUid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const instrumentId = parseInstrumentId(instrumentUid);

function candle(input: {
  interval: '5m' | '1h' | '1d';
  start: string;
  end: string;
  high: string;
  low: string;
  close: string;
  isClosed: boolean;
}) {
  return parseCandle({
    instrumentId,
    provider: 't-invest',
    interval: input.interval,
    timeStart: input.start,
    timeEnd: input.end,
    open: input.low,
    high: input.high,
    low: input.low,
    close: input.close,
    volume: '1',
    volumeUnit: 'lots',
    turnover: null,
    isClosed: input.isClosed,
    quality: 'good',
    sourceRevision: null,
  });
}

describe('market routes', () => {
  it('returns chart candles and fibonacci pivots from provider data', async () => {
    const marketData: MarketDataProvider = {
      getInstrumentCatalog: async () => [
        {
          provider: 't-invest',
          providerInstrumentId: instrumentUid,
          assetType: 'future',
          ticker: 'NG-12.26',
          name: 'Natural Gas Dec26',
          currency: 'USD',
          classCode: 'SPBFUT',
          engine: null,
          market: null,
          board: null,
          secid: null,
          isActive: true,
        },
      ],
      getInstrumentSpec: async () => ({
        providerInstrumentId: instrumentUid,
        validFrom: parseIsoDateTime('2025-01-01T00:00:00.000Z'),
        validTo: null,
        lotSize: 1,
        minPriceIncrement: parseDecimalString('0.1'),
        priceCurrency: 'USD',
        priceType: 'points',
        contractMultiplier: null,
        expirationAt: null,
        marginInitial: null,
        raw: {},
      }),
      getLastPrices: async () => [],
      getTrades: async () => ({
        items: [
          {
            instrumentId,
            provider: 't-invest',
            price: parseDecimalString('3.0'),
            quantity: parseDecimalString('10'),
            direction: 'buy',
            eventTime: parseIsoDateTime('2026-11-05T10:01:00.000Z'),
          },
          {
            instrumentId,
            provider: 't-invest',
            price: parseDecimalString('3.1'),
            quantity: parseDecimalString('40'),
            direction: 'sell',
            eventTime: parseIsoDateTime('2026-11-05T10:02:00.000Z'),
          },
          {
            instrumentId,
            provider: 't-invest',
            price: parseDecimalString('3.2'),
            quantity: parseDecimalString('5'),
            direction: 'buy',
            eventTime: parseIsoDateTime('2026-11-05T10:03:00.000Z'),
          },
        ],
        effectiveFrom: parseIsoDateTime('2026-11-05T00:00:00.000Z'),
        effectiveTo: parseIsoDateTime('2026-11-06T00:00:00.000Z'),
        historyTradeDays: ['2026-11-05'],
        missingDays: [],
        lastTradesIncluded: false,
        source: 'history_trades',
      }),
      getCandles: async (input) => {
        if (input.interval === '5m') {
          return {
            items: [
              candle({
                interval: '5m',
                start: '2026-11-05T10:00:00.000Z',
                end: '2026-11-05T10:05:00.000Z',
                high: '3.2',
                low: '3.0',
                close: '3.1',
                isClosed: true,
              }),
            ],
          };
        }
        return {
          items: [
            candle({
              interval: '1d',
              start: '2026-11-03T07:00:00.000Z',
              end: '2026-11-04T07:00:00.000Z',
              high: '110',
              low: '100',
              close: '105',
              isClosed: true,
            }),
            candle({
              interval: '1d',
              start: '2026-11-04T07:00:00.000Z',
              end: '2026-11-05T07:00:00.000Z',
              high: '120',
              low: '110',
              close: '115',
              isClosed: true,
            }),
            candle({
              interval: '1d',
              start: '2026-11-05T07:00:00.000Z',
              end: '2026-11-06T07:00:00.000Z',
              high: '125',
              low: '115',
              close: '120',
              isClosed: true,
            }),
          ],
        };
      },
    };

    const env = loadEnv({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
    });
    const app = await createApp({ env, marketData: { marketData } });

    const lookup = await app.inject({
      method: 'GET',
      url: '/api/v1/instruments/by-ticker/NG-12.26',
    });
    expect(lookup.statusCode).toBe(200);
    expect(lookup.json()).toMatchObject({ instrumentUid, ticker: 'NG-12.26' });

    const candles = await app.inject({
      method: 'GET',
      url: `/api/v1/instruments/${instrumentUid}/candles?interval=5m&from=2026-11-05T00:00:00.000Z&to=2026-11-06T00:00:00.000Z`,
    });
    expect(candles.statusCode).toBe(200);
    expect(candles.json().items).toHaveLength(1);

    const pivots = await app.inject({
      method: 'GET',
      url: `/api/v1/instruments/${instrumentUid}/indicators/fibonacci-pivots?timeframe=5m&from=2026-11-04T00:00:00.000Z&to=2026-11-06T00:00:00.000Z`,
    });
    expect(pivots.statusCode).toBe(200);
    const body = pivots.json();
    expect(body.referenceTimeframe).toBe('1D');
    expect(body.periods.length).toBeGreaterThanOrEqual(1);
    expect(body.periods[0]?.values.p).toBeTruthy();
    expect(body.periods[0]?.algorithm.coefficients).toEqual(['0.382', '0.618', '1.000']);

    const horizontalVolume = await app.inject({
      method: 'GET',
      url: `/api/v1/instruments/${instrumentUid}/indicators/horizontal-volume?timeframe=5m&from=2026-11-05T00:00:00.000Z&to=2026-11-06T00:00:00.000Z`,
    });
    expect(horizontalVolume.statusCode).toBe(200);
    const profile = horizontalVolume.json();
    expect(profile.sourceKind).toBe('last_trades');
    expect(profile.algorithm.id).toBe('HORIZONTAL_VOLUME_TRADES');
    expect(profile.tickSize).toBe('0.1');
    expect(profile.levels.length).toBeGreaterThan(0);
    expect(profile.poc).toBe('3.1');
    expect(profile.volumeUnit).toBe('lots');
    expect(profile.totalBuyVolume).toBe('15');
    expect(profile.totalSellVolume).toBe('40');
    expect(profile.meta.tradeCount).toBe(3);
    expect(profile.meta.tradesSource).toBe('history_trades');
    expect(profile.meta.historyTradeDays).toEqual(['2026-11-05']);
    expect(
      profile.levels.find((level: { price: string }) => level.price === '3.1')?.sellVolume,
    ).toBe('40');
  });
});

function futureRow(input: {
  uid: string;
  ticker: string;
  name: string;
  isActive?: boolean;
}): ProviderInstrument {
  return {
    provider: 't-invest',
    providerInstrumentId: input.uid,
    assetType: 'future',
    ticker: input.ticker,
    name: input.name,
    currency: 'RUB',
    classCode: 'SPBFUT',
    engine: null,
    market: null,
    board: null,
    secid: null,
    isActive: input.isActive ?? true,
  };
}

function futureSpec(input: {
  uid: string;
  underlyingAssetType: 'commodity' | 'equity_index' | 'currency' | 'share';
  underlyingAssetName: string;
  contractFamily: string;
  expirationAt: string;
}): InstrumentSpecInput {
  return {
    providerInstrumentId: input.uid,
    validFrom: parseIsoDateTime('2025-01-01T00:00:00.000Z'),
    validTo: null,
    lotSize: 1,
    minPriceIncrement: parseDecimalString('0.01'),
    priceCurrency: 'RUB',
    priceType: 'points',
    contractMultiplier: null,
    expirationAt: parseIsoDateTime(input.expirationAt),
    marginInitial: null,
    underlyingProviderPositionUid: null,
    underlyingAssetType: input.underlyingAssetType,
    underlyingAssetName: input.underlyingAssetName,
    contractFamily: input.contractFamily,
    priceUnit: 'points',
    minPriceIncrementAmount: null,
    raw: {},
  };
}

describe('GET /api/v1/instruments/futures', () => {
  it('returns full catalog buckets with near/next and skips inactive', async () => {
    const brNearUid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
    const brNextUid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
    const inactiveUid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
    const indexUid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4';

    const specs = new Map<string, InstrumentSpecInput>([
      [
        brNearUid,
        futureSpec({
          uid: brNearUid,
          underlyingAssetType: 'commodity',
          underlyingAssetName: 'Brent',
          contractFamily: 'BR',
          expirationAt: '2026-02-16T00:00:00.000Z',
        }),
      ],
      [
        brNextUid,
        futureSpec({
          uid: brNextUid,
          underlyingAssetType: 'commodity',
          underlyingAssetName: 'Brent',
          contractFamily: 'BR',
          expirationAt: '2026-04-16T00:00:00.000Z',
        }),
      ],
      [
        inactiveUid,
        futureSpec({
          uid: inactiveUid,
          underlyingAssetType: 'commodity',
          underlyingAssetName: 'Brent',
          contractFamily: 'BR',
          expirationAt: '2026-01-16T00:00:00.000Z',
        }),
      ],
      [
        indexUid,
        futureSpec({
          uid: indexUid,
          underlyingAssetType: 'equity_index',
          underlyingAssetName: 'IMOEX',
          contractFamily: 'MX',
          expirationAt: '2026-03-19T00:00:00.000Z',
        }),
      ],
    ]);

    const marketData: MarketDataProvider = {
      getInstrumentCatalog: async () => [
        futureRow({ uid: brNearUid, ticker: 'BRH6', name: 'Brent-3.26' }),
        futureRow({ uid: brNextUid, ticker: 'BRJ6', name: 'Brent-4.26' }),
        futureRow({ uid: inactiveUid, ticker: 'BRF6', name: 'Brent-1.26', isActive: false }),
        futureRow({ uid: indexUid, ticker: 'MXH6', name: 'MIX-3.26' }),
      ],
      getInstrumentSpec: async (providerInstrumentId) => {
        const spec = specs.get(providerInstrumentId);
        if (spec === undefined) {
          throw new Error(`missing spec ${providerInstrumentId}`);
        }
        return spec;
      },
      getLastPrices: async () => [],
      getTrades: async () => ({
        items: [],
        effectiveFrom: parseIsoDateTime('2026-11-05T00:00:00.000Z'),
        effectiveTo: parseIsoDateTime('2026-11-05T01:00:00.000Z'),
        historyTradeDays: [],
        missingDays: [],
        lastTradesIncluded: false,
        source: 'history_trades',
      }),
      getCandles: async () => ({ items: [] }),
    };

    const env = loadEnv({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
    });
    const app = await createApp({ env, marketData: { marketData } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/instruments/futures',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.categories).toHaveLength(4);
    expect(body.categories.map((item: { category: string }) => item.category)).toEqual([
      'commodity',
      'equity_index',
      'currency',
      'share',
    ]);
    expect(body.categories[0]).toMatchObject({
      category: 'commodity',
      families: [
        {
          family: 'BR',
          underlyingAssetName: 'Brent',
          contracts: [
            {
              role: 'near',
              ticker: 'BRH6',
              instrumentUid: brNearUid,
              name: 'Brent-3.26',
              expirationAt: '2026-02-16T00:00:00.000Z',
              classCode: 'SPBFUT',
              isActive: true,
            },
            {
              role: 'next',
              ticker: 'BRJ6',
              instrumentUid: brNextUid,
              name: 'Brent-4.26',
              expirationAt: '2026-04-16T00:00:00.000Z',
              classCode: 'SPBFUT',
              isActive: true,
            },
          ],
        },
      ],
    });
    expect(body.categories[1]?.families[0]?.family).toBe('MX');
    expect(body.categories[2]?.families).toEqual([]);
    expect(body.categories[3]?.families).toEqual([]);
  });

  it('maps T-Invest RESOURCE_EXHAUSTED to HTTP 429 when cache is empty', async () => {
    const marketData: MarketDataProvider = {
      getInstrumentCatalog: async () => {
        throw new Error(
          '/tinkoff.public.invest.api.contract.v1.InstrumentsService/Futures RESOURCE_EXHAUSTED: ',
        );
      },
      getInstrumentSpec: async () => {
        throw new Error('unused');
      },
      getLastPrices: async () => [],
      getTrades: async () => ({
        items: [],
        effectiveFrom: parseIsoDateTime('2026-11-05T00:00:00.000Z'),
        effectiveTo: parseIsoDateTime('2026-11-05T01:00:00.000Z'),
        historyTradeDays: [],
        missingDays: [],
        lastTradesIncluded: false,
        source: 'history_trades',
      }),
      getCandles: async () => ({ items: [] }),
    };
    const env = loadEnv({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
    });
    const app = await createApp({ env, marketData: { marketData } });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/instruments/futures',
    });
    expect(response.statusCode).toBe(429);
    expect(String(response.json().error)).toContain('RESOURCE_EXHAUSTED');
  });
});
