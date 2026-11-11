import type { InstrumentSpecInput, MarketDataProvider } from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime } from '@moex/domain';
import { createMemoryFuturesCatalogCacheRepository } from '@moex/persistence';
import { describe, expect, it } from 'vitest';
import { listFuturesByCategory } from './list-futures-by-category.js';

function futureSpec(input: {
  uid: string;
  underlyingAssetType: 'commodity' | 'equity_index';
  underlyingAssetName: string;
  contractFamily: string;
  expirationAt: string;
  sector: string;
  assetType: string;
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
    raw: {
      sector: input.sector,
      assetType: input.assetType,
    },
  };
}

describe('listFuturesByCategory cache fallback', () => {
  it('persists snapshot on success and serves cache when live catalog fails', async () => {
    const nearUid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
    const nextUid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
    const specs = new Map<string, InstrumentSpecInput>([
      [
        nearUid,
        futureSpec({
          uid: nearUid,
          underlyingAssetType: 'commodity',
          underlyingAssetName: 'Brent',
          contractFamily: 'BR',
          expirationAt: '2026-02-16T00:00:00.000Z',
          sector: 'commodity',
          assetType: 'commodity',
        }),
      ],
      [
        nextUid,
        futureSpec({
          uid: nextUid,
          underlyingAssetType: 'commodity',
          underlyingAssetName: 'Brent',
          contractFamily: 'BR',
          expirationAt: '2026-04-16T00:00:00.000Z',
          sector: 'commodity',
          assetType: 'commodity',
        }),
      ],
    ]);

    let failLive = false;
    const marketData: MarketDataProvider = {
      getInstrumentCatalog: async () => {
        if (failLive) {
          throw new Error('8 RESOURCE_EXHAUSTED: resource exhausted');
        }
        return [
          {
            provider: 't-invest',
            providerInstrumentId: nearUid,
            assetType: 'future',
            ticker: 'BRH6',
            name: 'Brent-3.26',
            currency: 'RUB',
            classCode: 'SPBFUT',
            engine: null,
            market: null,
            board: null,
            secid: null,
            isActive: true,
          },
          {
            provider: 't-invest',
            providerInstrumentId: nextUid,
            assetType: 'future',
            ticker: 'BRJ6',
            name: 'Brent-4.26',
            currency: 'RUB',
            classCode: 'SPBFUT',
            engine: null,
            market: null,
            board: null,
            secid: null,
            isActive: true,
          },
        ];
      },
      getInstrumentSpec: async (id) => {
        const spec = specs.get(id);
        if (spec === undefined) {
          throw new Error(`missing ${id}`);
        }
        return spec;
      },
      getLastPrices: async () => [],
      getCandles: async () => ({ items: [] }),
    };

    const futuresCatalogCache = createMemoryFuturesCatalogCacheRepository();
    const deps = { marketData, futuresCatalogCache };

    const live = await listFuturesByCategory(deps, 'commodity');
    expect(live.families).toHaveLength(1);
    expect(live.families[0]?.contracts).toHaveLength(2);
    expect(await futuresCatalogCache.listActiveByCategory('t-invest', 'commodity')).toHaveLength(2);

    failLive = true;
    const cached = await listFuturesByCategory(deps, 'commodity');
    expect(cached.families[0]?.contracts.map((c) => c.ticker)).toEqual(['BRH6', 'BRJ6']);
  });

  it('rethrows when live fails and cache is empty', async () => {
    const marketData: MarketDataProvider = {
      getInstrumentCatalog: async () => {
        throw new Error('8 RESOURCE_EXHAUSTED: resource exhausted');
      },
      getInstrumentSpec: async () => {
        throw new Error('unused');
      },
      getLastPrices: async () => [],
      getCandles: async () => ({ items: [] }),
    };
    await expect(
      listFuturesByCategory(
        { marketData, futuresCatalogCache: createMemoryFuturesCatalogCacheRepository() },
        'commodity',
      ),
    ).rejects.toThrow(/RESOURCE_EXHAUSTED/);
  });
});
