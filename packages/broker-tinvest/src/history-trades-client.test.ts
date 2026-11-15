import { describe, expect, it } from 'vitest';
import {
  createHistoryTradesClient,
  decodeArchiveToCsv,
  enumerateUtcDates,
  parseTradesCsv,
} from './history-trades-client.js';

describe('history-trades-client', () => {
  it('parses History MD trades CSV with header', () => {
    const csv = [
      'TRADE_TS,TICKER_CC,DIRECTION,PRICE,QUANTITY,TRADE_SOURCE,INSTRUMENT_UID',
      '2026-11-10T10:00:01.000Z,BRH6_SPBFUT,BUY,72.5,10,EXCHANGE,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-11-10T10:00:02.000Z,BRH6_SPBFUT,SELL,72.4,3,EXCHANGE,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ].join('\n');

    const trades = parseTradesCsv(csv, 'fallback-uid');
    expect(trades).toHaveLength(2);
    expect(trades[0]?.direction).toBe('buy');
    expect(trades[0]?.price).toBe('72.5');
    expect(trades[0]?.quantity).toBe('10');
    expect(trades[1]?.direction).toBe('sell');
  });

  it('decodes plain UTF-8 archive bytes', () => {
    const text = 'TRADE_TS,TICKER_CC,DIRECTION,PRICE,QUANTITY,TRADE_SOURCE,INSTRUMENT_UID\n';
    expect(decodeArchiveToCsv(Buffer.from(text))).toContain('TRADE_TS');
  });

  it('enumerates inclusive UTC calendar days', () => {
    expect(
      enumerateUtcDates(new Date('2026-11-10T12:00:00.000Z'), new Date('2026-11-12T12:00:00.000Z')),
    ).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
  });

  it('returns null on HTTP 404 from history-trades', async () => {
    const client = createHistoryTradesClient({
      token: 'test-token',
      hosts: ['https://example.test'],
      fetchImpl: async () => new Response(null, { status: 404 }),
    });
    await expect(
      client.fetchDayTrades({
        instrumentUid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        date: '2026-11-10',
      }),
    ).resolves.toBeNull();
  });

  it('parses CSV body on HTTP 200', async () => {
    const csv = [
      'TRADE_TS,TICKER_CC,DIRECTION,PRICE,QUANTITY,TRADE_SOURCE,INSTRUMENT_UID',
      '2026-11-10T10:00:01.000Z,BRH6_SPBFUT,BUY,1,2,EXCHANGE,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ].join('\n');
    const client = createHistoryTradesClient({
      token: 'test-token',
      hosts: ['https://example.test'],
      fetchImpl: async () => new Response(csv, { status: 200 }),
    });
    const trades = await client.fetchDayTrades({
      instrumentUid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      date: '2026-11-10',
    });
    expect(trades).toHaveLength(1);
    expect(trades?.[0]?.quantity).toBe('2');
  });
});
