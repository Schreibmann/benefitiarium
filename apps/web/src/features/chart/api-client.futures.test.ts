import { describe, expect, it } from 'vitest';
import { createChartApiClient } from './api-client.js';

describe('createChartApiClient.listFuturesCatalog', () => {
  it('parses full catalog response', async () => {
    const client = createChartApiClient({
      fetchImpl: async (input) => {
        const url = String(input);
        expect(url).toContain('/api/v1/instruments/futures');
        expect(url).not.toContain('category=');
        return new Response(
          JSON.stringify({
            syncedAt: '2026-11-09T20:00:00.000Z',
            categories: [
              {
                category: 'commodity',
                families: [
                  {
                    family: 'BR',
                    underlyingAssetName: 'Brent',
                    contracts: [
                      {
                        role: 'near',
                        ticker: 'BRH6',
                        instrumentUid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
                        name: 'Brent-3.26',
                        expirationAt: '2026-02-16T00:00:00.000Z',
                        classCode: 'SPBFUT',
                        isActive: true,
                      },
                    ],
                  },
                ],
              },
              { category: 'equity_index', families: [] },
              { category: 'currency', families: [] },
              { category: 'share', families: [] },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const result = await client.listFuturesCatalog();
    expect(result.syncedAt).toBe('2026-11-09T20:00:00.000Z');
    expect(result.categories).toHaveLength(4);
    expect(result.categories[0]?.families[0]?.family).toBe('BR');
    expect(result.categories[0]?.families[0]?.contracts[0]?.ticker).toBe('BRH6');
  });
});
