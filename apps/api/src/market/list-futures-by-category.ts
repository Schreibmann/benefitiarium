import type { UnderlyingAssetType } from '@moex/domain';
import type {
  FuturesCatalogCacheRepository,
  FuturesCatalogCacheRow,
  FuturesCatalogListCategory,
} from '@moex/persistence';
import type { ChartMarketDataDeps } from './fibonacci-pivot-service.js';
import {
  type FuturesContractCandidate,
  type FuturesFamilyDto,
  selectFrontNextByFamily,
} from './select-front-next-by-family.js';

export const FUTURES_LIST_CATEGORIES = ['commodity', 'equity_index', 'currency', 'share'] as const;

export type FuturesListCategory = (typeof FUTURES_LIST_CATEGORIES)[number];

export type FuturesCategoryBucket = {
  category: FuturesListCategory;
  families: FuturesFamilyDto[];
};

export type FuturesCatalogResponse = {
  syncedAt: string;
  categories: FuturesCategoryBucket[];
};

/** @deprecated single-category shape removed from HTTP; kept for unit helpers/tests. */
export type FuturesCategoryResponse = {
  category: FuturesListCategory;
  families: FuturesFamilyDto[];
};

export function parseFuturesListCategory(value: string): FuturesListCategory {
  for (const category of FUTURES_LIST_CATEGORIES) {
    if (category === value) {
      return category;
    }
  }
  throw new Error('category must be commodity, equity_index, currency, or share');
}

function isFuturesListCategory(
  value: UnderlyingAssetType | null | undefined,
): value is FuturesListCategory {
  return (
    value === 'commodity' || value === 'equity_index' || value === 'currency' || value === 'share'
  );
}

function toCacheListCategory(
  value: UnderlyingAssetType | null | undefined,
): FuturesCatalogListCategory {
  if (isFuturesListCategory(value)) {
    return value;
  }
  return 'other';
}

function candidatesFromCacheRows(
  rows: readonly FuturesCatalogCacheRow[],
): FuturesContractCandidate[] {
  const candidates: FuturesContractCandidate[] = [];
  for (const row of rows) {
    if (!row.isActive) {
      continue;
    }
    if (row.listCategory === 'other') {
      continue;
    }
    if (row.contractFamily === null || row.contractFamily.trim().length === 0) {
      continue;
    }
    if (row.expirationAt === null || row.expirationAt.trim().length === 0) {
      continue;
    }
    candidates.push({
      ticker: row.ticker,
      instrumentUid: row.providerInstrumentId,
      name: row.name,
      classCode: row.classCode,
      isActive: row.isActive,
      family: row.contractFamily,
      underlyingAssetName: row.basicAsset,
      expirationAt: row.expirationAt,
    });
  }
  return candidates;
}

export function buildFuturesCatalogResponse(
  rows: readonly FuturesCatalogCacheRow[],
  syncedAtFallback: string,
): FuturesCatalogResponse {
  let syncedAt = syncedAtFallback;
  for (const row of rows) {
    if (row.syncedAt > syncedAt) {
      syncedAt = row.syncedAt;
    }
  }

  const categories: FuturesCategoryBucket[] = FUTURES_LIST_CATEGORIES.map((category) => {
    const categoryRows = rows.filter((row) => row.listCategory === category);
    return {
      category,
      families: selectFrontNextByFamily(candidatesFromCacheRows(categoryRows)),
    };
  });

  return { syncedAt, categories };
}

async function loadLiveSnapshotRows(deps: ChartMarketDataDeps): Promise<FuturesCatalogCacheRow[]> {
  const catalog = await deps.marketData.getInstrumentCatalog();
  const snapshotRows: FuturesCatalogCacheRow[] = [];
  const syncedAt = new Date().toISOString();

  for (const row of catalog) {
    if (row.assetType !== 'future') {
      continue;
    }
    let underlyingAssetType: UnderlyingAssetType | null | undefined;
    let underlyingAssetName: string | null = null;
    let contractFamily: string | null = null;
    let expirationAt: string | null = null;
    let sector = '';
    let assetTypeRaw: string | null = null;
    try {
      const spec = await deps.marketData.getInstrumentSpec(row.providerInstrumentId);
      underlyingAssetType = spec.underlyingAssetType ?? null;
      underlyingAssetName = spec.underlyingAssetName ?? null;
      contractFamily = spec.contractFamily ?? null;
      expirationAt = spec.expirationAt;
      const raw = spec.raw;
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const sectorValue = raw.sector;
        const assetTypeValue = raw.assetType;
        sector = typeof sectorValue === 'string' ? sectorValue : '';
        assetTypeRaw = typeof assetTypeValue === 'string' ? assetTypeValue : null;
      }
    } catch {
      continue;
    }

    snapshotRows.push({
      provider: 't-invest',
      providerInstrumentId: row.providerInstrumentId,
      ticker: row.ticker,
      name: row.name,
      classCode: row.classCode,
      sector,
      assetTypeRaw,
      basicAsset: underlyingAssetName,
      contractFamily,
      expirationAt,
      isActive: row.isActive,
      listCategory: toCacheListCategory(underlyingAssetType),
      syncedAt,
    });
  }

  return snapshotRows;
}

async function refreshCatalogCache(
  cache: FuturesCatalogCacheRepository,
  rows: FuturesCatalogCacheRow[],
): Promise<void> {
  await cache.replaceAll('t-invest', rows);
}

let catalogRefreshInflight: Promise<void> | null = null;

function scheduleCatalogRefresh(deps: ChartMarketDataDeps): void {
  const cache = deps.futuresCatalogCache;
  if (cache === undefined) {
    return;
  }
  if (catalogRefreshInflight !== null) {
    return;
  }
  catalogRefreshInflight = (async () => {
    try {
      const rows = await loadLiveSnapshotRows(deps);
      await refreshCatalogCache(cache, rows);
    } catch {
      // Keep serving the durable snapshot; live refresh is best-effort.
    } finally {
      catalogRefreshInflight = null;
    }
  })();
}

/**
 * Full futures catalog (all categories), near+next per family.
 * Warm path: Postgres snapshot immediately + background live refresh.
 * Cold path: await live load when cache is empty / unavailable.
 */
export async function listFuturesCatalog(
  deps: ChartMarketDataDeps,
): Promise<FuturesCatalogResponse> {
  const cache = deps.futuresCatalogCache;
  if (cache !== undefined) {
    const cached = await cache.listActive('t-invest');
    if (cached.length > 0) {
      const response = buildFuturesCatalogResponse(
        cached,
        cached[0]?.syncedAt ?? new Date().toISOString(),
      );
      scheduleCatalogRefresh(deps);
      return response;
    }
  }

  const snapshotRows = await loadLiveSnapshotRows(deps);
  if (cache !== undefined) {
    await refreshCatalogCache(cache, snapshotRows);
  }
  return buildFuturesCatalogResponse(snapshotRows, new Date().toISOString());
}

/**
 * @deprecated Prefer listFuturesCatalog. Kept for focused unit tests of cache fallback.
 */
export async function listFuturesByCategory(
  deps: ChartMarketDataDeps,
  category: FuturesListCategory,
): Promise<FuturesCategoryResponse> {
  const full = await listFuturesCatalog(deps);
  const bucket = full.categories.find((item) => item.category === category);
  return {
    category,
    families: bucket?.families ?? [],
  };
}
