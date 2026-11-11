import { describe, expect, it } from 'vitest';
import type { DbExecutor } from '../db/client.js';
import {
  createFuturesCatalogCacheRepository,
  createMemoryFuturesCatalogCacheRepository,
  type FuturesCatalogCacheRow,
} from './futures-catalog-cache.js';

function sampleRow(index: number): FuturesCatalogCacheRow {
  return {
    provider: 't-invest',
    providerInstrumentId: `uid-${index}`,
    ticker: `T${index}`,
    name: `Name ${index}`,
    classCode: 'SPBFUT',
    sector: 'commodity',
    assetTypeRaw: 'commodity',
    basicAsset: 'Brent',
    contractFamily: 'BR',
    expirationAt: '2026-02-16T00:00:00.000Z',
    isActive: true,
    listCategory: 'commodity',
    syncedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('createFuturesCatalogCacheRepository', () => {
  it('replaceAll upserts in chunks then deletes stale synced_at rows', async () => {
    const executes: Array<{ sql: string; params: unknown[] }> = [];
    const db: DbExecutor = {
      execute: async (sql, params = []) => {
        executes.push({ sql, params });
      },
      queryJson: async () => [],
      queryJsonValue: async <T>(): Promise<T> => {
        throw new Error('queryJsonValue unused');
      },
    };

    const repo = createFuturesCatalogCacheRepository(db);
    const rows = Array.from({ length: 85 }, (_item, index) => sampleRow(index));
    await repo.replaceAll('t-invest', rows);

    expect(executes).toHaveLength(4);
    expect(executes[0]?.sql).toContain('INSERT INTO futures_catalog_cache');
    expect(executes[0]?.params).toHaveLength(40 * 13);
    expect(executes[1]?.params).toHaveLength(40 * 13);
    expect(executes[2]?.params).toHaveLength(5 * 13);
    expect(executes[3]?.sql).toContain('synced_at IS DISTINCT FROM');
    expect(executes[3]?.params[0]).toBe('t-invest');
  });
});

describe('createMemoryFuturesCatalogCacheRepository', () => {
  it('replaceAll then listActiveByCategory returns only matching active rows', async () => {
    const repo = createMemoryFuturesCatalogCacheRepository();
    await repo.replaceAll('t-invest', [
      {
        provider: 't-invest',
        providerInstrumentId: 'uid-br-1',
        ticker: 'BRH6',
        name: 'Brent-3.26',
        classCode: 'SPBFUT',
        sector: 'commodity',
        assetTypeRaw: 'commodity',
        basicAsset: 'Brent',
        contractFamily: 'BR',
        expirationAt: '2026-02-16T00:00:00.000Z',
        isActive: true,
        listCategory: 'commodity',
        syncedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        provider: 't-invest',
        providerInstrumentId: 'uid-mx-1',
        ticker: 'MXH6',
        name: 'MIX-3.26',
        classCode: 'SPBFUT',
        sector: 'index',
        assetTypeRaw: 'index',
        basicAsset: 'IMOEX',
        contractFamily: 'MX',
        expirationAt: '2026-03-19T00:00:00.000Z',
        isActive: true,
        listCategory: 'equity_index',
        syncedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        provider: 't-invest',
        providerInstrumentId: 'uid-br-old',
        ticker: 'BRZ5',
        name: 'Brent-12.25',
        classCode: 'SPBFUT',
        sector: 'commodity',
        assetTypeRaw: 'commodity',
        basicAsset: 'Brent',
        contractFamily: 'BR',
        expirationAt: '2025-12-16T00:00:00.000Z',
        isActive: false,
        listCategory: 'commodity',
        syncedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const commodity = await repo.listActiveByCategory('t-invest', 'commodity');
    expect(commodity).toHaveLength(1);
    expect(commodity[0]?.ticker).toBe('BRH6');
    expect(commodity[0]?.sector).toBe('commodity');

    const all = await repo.listActive('t-invest');
    expect(all.map((row) => row.ticker).sort()).toEqual(['BRH6', 'MXH6']);
  });

  it('replaceAll with empty list clears the snapshot', async () => {
    const repo = createMemoryFuturesCatalogCacheRepository();
    await repo.replaceAll('t-invest', [
      {
        provider: 't-invest',
        providerInstrumentId: 'uid-1',
        ticker: 'BRH6',
        name: 'Brent',
        classCode: 'SPBFUT',
        sector: 'commodity',
        assetTypeRaw: 'commodity',
        basicAsset: 'Brent',
        contractFamily: 'BR',
        expirationAt: '2026-02-16T00:00:00.000Z',
        isActive: true,
        listCategory: 'commodity',
        syncedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    await repo.replaceAll('t-invest', []);
    expect(await repo.listActive('t-invest')).toEqual([]);
  });
});
