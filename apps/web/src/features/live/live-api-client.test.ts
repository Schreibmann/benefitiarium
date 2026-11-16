import { describe, expect, it, vi } from 'vitest';
import { createLiveApiClient } from './live-api-client.js';

describe('createLiveApiClient', () => {
  it('parses live snapshot and broker favorites list', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/live') && (init?.method === undefined || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            status: 'RUNNING',
            desiredStatus: 'RUNNING',
            favoriteCount: 1,
            strategyLeaseCount: 1,
            analysisIntervals: ['5m'],
            lastError: null,
            updatedAt: '2026-11-16T12:00:00.000Z',
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/api/v1/favorites')) {
        return new Response(
          JSON.stringify({
            source: 'tinvest',
            items: [
              {
                instrumentUid: 'uid-1',
                ticker: 'SBER',
                figi: 'BBG004730N88',
                createdAt: '1970-01-01T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response('not found', { status: 404 });
    });

    const client = createLiveApiClient({ fetchImpl });
    const live = await client.getLive();
    expect(live.status).toBe('RUNNING');
    const favorites = await client.listFavorites();
    expect(favorites[0]?.ticker).toBe('SBER');
  });
});
