import { loadEnv } from '@moex/config';
import type { MarketDataProvider } from '@moex/contracts';
import { parseCandle, parseInstrumentId } from '@moex/domain';
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
      getInstrumentSpec: async () => {
        throw new Error('unused');
      },
      getLastPrices: async () => [],
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
  });
});
