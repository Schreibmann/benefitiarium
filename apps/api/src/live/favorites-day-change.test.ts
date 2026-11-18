import type { MarketDataProvider } from '@moex/contracts';
import type { Candle } from '@moex/domain';
import { parseDecimalString, parseInstrumentId, parseIsoDateTime } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { withFavoritesDayChange } from './favorites-day-change.js';

const UID = 'e6123145-9665-43e0-8413-cd61b8aa9b13';
const INSTRUMENT_ID = parseInstrumentId(UID);

function candle(partial: {
  timeStart: string;
  timeEnd: string;
  open: string;
  close: string;
}): Candle {
  return {
    instrumentId: INSTRUMENT_ID,
    provider: 't-invest',
    interval: '1d',
    timeStart: parseIsoDateTime(partial.timeStart),
    timeEnd: parseIsoDateTime(partial.timeEnd),
    open: parseDecimalString(partial.open),
    high: parseDecimalString(partial.close),
    low: parseDecimalString(partial.open),
    close: parseDecimalString(partial.close),
    volume: parseDecimalString('1'),
    volumeUnit: 'lots',
    turnover: null,
    isClosed: true,
    quality: 'good',
    sourceRevision: null,
  };
}

function createMarketData(input: { last?: string; candles?: Candle[] }): MarketDataProvider {
  return {
    getInstrumentCatalog: async () => [],
    getInstrumentSpec: async () => {
      throw new Error('unused');
    },
    getCandles: async () => ({ items: input.candles ?? [] }),
    getLastPrices: async () =>
      input.last === undefined
        ? []
        : [
            {
              instrumentId: INSTRUMENT_ID,
              provider: 't-invest',
              eventTime: parseIsoDateTime('2026-11-18T12:00:00.000Z'),
              receivedAt: parseIsoDateTime('2026-11-18T12:00:00.000Z'),
              quality: 'good',
              last: parseDecimalString(input.last),
            },
          ],
    getTrades: async () => {
      throw new Error('unused');
    },
  };
}

describe('withFavoritesDayChange', () => {
  it('computes day change vs previous session close', async () => {
    const items = await withFavoritesDayChange(
      [
        {
          instrumentUid: UID,
          ticker: 'BRH6',
          figi: null,
          createdAt: '1970-01-01T00:00:00.000Z',
        },
      ],
      createMarketData({
        last: '110',
        candles: [
          candle({
            timeStart: '2026-11-16T00:00:00.000Z',
            timeEnd: '2026-11-17T00:00:00.000Z',
            open: '95',
            close: '100',
          }),
          candle({
            timeStart: '2026-11-17T00:00:00.000Z',
            timeEnd: '2026-11-18T00:00:00.000Z',
            open: '101',
            close: '108',
          }),
        ],
      }),
    );

    expect(items[0]?.lastPrice).toBe('110');
    expect(items[0]?.dayChangePct).toBe(10);
  });

  it('falls back to today open when only one candle exists', async () => {
    const items = await withFavoritesDayChange(
      [
        {
          instrumentUid: UID,
          ticker: 'BRH6',
          figi: null,
          createdAt: '1970-01-01T00:00:00.000Z',
        },
      ],
      createMarketData({
        last: '105',
        candles: [
          candle({
            timeStart: '2026-11-18T00:00:00.000Z',
            timeEnd: '2026-11-19T00:00:00.000Z',
            open: '100',
            close: '104',
          }),
        ],
      }),
    );

    expect(items[0]?.dayChangePct).toBe(5);
  });

  it('returns null day change when market data is empty', async () => {
    const items = await withFavoritesDayChange(
      [
        {
          instrumentUid: UID,
          ticker: 'BRH6',
          figi: null,
          createdAt: '1970-01-01T00:00:00.000Z',
        },
      ],
      createMarketData({}),
    );

    expect(items[0]?.lastPrice).toBeNull();
    expect(items[0]?.dayChangePct).toBeNull();
  });
});
