import { describe, expect, it, vi } from 'vitest';
import { MoexIssClient } from './client.js';

describe('MoexIssClient', () => {
  it('retries on 503 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            engines: {
              columns: ['name'],
              data: [['stock']],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const client = new MoexIssClient({
      baseUrl: 'https://iss.moex.com/iss',
      fetchImpl,
      maxRetries: 2,
      timeoutMs: 5_000,
    });

    const rows = await client.getBlockRows('/engines.json', 'engines');
    expect(rows).toEqual([{ name: 'stock' }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('sends Bearer token in authenticated mode', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candles: { columns: ['begin'], data: [['2026-01-01']] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new MoexIssClient({
      baseUrl: 'https://iss.moex.com/iss',
      fetchImpl,
      authMode: 'authenticated',
      authToken: 'test-token',
    });
    await client.getJson('/engines/futures/markets/forts/boards/rfud/securities/BRH6/candles.json');
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('paginates with start until short page', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      const start = Number(url.searchParams.get('start') ?? '0');
      const page =
        start === 0
          ? {
              columns: ['SECID'],
              data: Array.from({ length: 100 }, (_, index) => [`T${index}`]),
            }
          : {
              columns: ['SECID'],
              data: [['T100']],
            };
      return new Response(JSON.stringify({ securities: page }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const fetchSpy = vi.fn(fetchImpl);

    const client = new MoexIssClient({
      baseUrl: 'https://iss.moex.com/iss',
      fetchImpl: fetchSpy,
      timeoutMs: 5_000,
    });

    const rows = await client.getAllBlockRows(
      '/engines/stock/markets/shares/securities.json',
      'securities',
    );
    expect(rows).toHaveLength(101);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
