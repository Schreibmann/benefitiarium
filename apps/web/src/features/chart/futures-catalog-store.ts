import { persistentAtom } from '@nanostores/persistent';
import { atom } from 'nanostores';
import type { ChartApiClient } from './api-client.js';
import type {
  FuturesCatalogResponse,
  FuturesCategoryBucket,
  FuturesFamily,
  FuturesFamilyContract,
  FuturesListCategory,
} from './types.js';

export type FuturesCatalogStatus = 'idle' | 'loading' | 'refreshing' | 'error';

export type FuturesCatalogState = {
  syncedAt: string | null;
  categories: FuturesCatalogResponse['categories'];
  status: FuturesCatalogStatus;
  error: string | null;
};

const EMPTY_CATEGORIES: FuturesCatalogResponse['categories'] = [
  { category: 'commodity', families: [] },
  { category: 'equity_index', families: [] },
  { category: 'currency', families: [] },
  { category: 'share', families: [] },
];

type PersistedCatalog = {
  syncedAt: string | null;
  categories: FuturesCatalogResponse['categories'];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFuturesListCategory(value: string): value is FuturesListCategory {
  return (
    value === 'commodity' || value === 'equity_index' || value === 'currency' || value === 'share'
  );
}

function parsePersistedContract(value: unknown): FuturesFamilyContract | null {
  if (!isRecord(value)) {
    return null;
  }
  const role = value.role;
  if (role !== 'near' && role !== 'next') {
    return null;
  }
  const ticker = value.ticker;
  const instrumentUid = value.instrumentUid;
  const name = value.name;
  const expirationAt = value.expirationAt;
  if (
    typeof ticker !== 'string' ||
    typeof instrumentUid !== 'string' ||
    typeof name !== 'string' ||
    typeof expirationAt !== 'string'
  ) {
    return null;
  }
  const classCodeRaw = value.classCode;
  return {
    role,
    ticker,
    instrumentUid,
    name,
    expirationAt,
    classCode: typeof classCodeRaw === 'string' ? classCodeRaw : null,
    isActive: value.isActive === true,
  };
}

function parsePersistedFamily(value: unknown): FuturesFamily | null {
  if (!isRecord(value) || !Array.isArray(value.contracts)) {
    return null;
  }
  const family = value.family;
  if (typeof family !== 'string') {
    return null;
  }
  const contracts: FuturesFamilyContract[] = [];
  for (const contractRaw of value.contracts) {
    const contract = parsePersistedContract(contractRaw);
    if (contract !== null) {
      contracts.push(contract);
    }
  }
  const underlyingRaw = value.underlyingAssetName;
  return {
    family,
    underlyingAssetName: typeof underlyingRaw === 'string' ? underlyingRaw : null,
    contracts,
  };
}

function parsePersistedCategories(value: unknown): FuturesCategoryBucket[] {
  if (!Array.isArray(value)) {
    return EMPTY_CATEGORIES;
  }
  const byCategory = new Map<FuturesListCategory, FuturesFamily[]>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.category !== 'string' ||
      !isFuturesListCategory(item.category)
    ) {
      continue;
    }
    if (!Array.isArray(item.families)) {
      continue;
    }
    const families: FuturesFamily[] = [];
    for (const familyRaw of item.families) {
      const family = parsePersistedFamily(familyRaw);
      if (family !== null) {
        families.push(family);
      }
    }
    byCategory.set(item.category, families);
  }
  return EMPTY_CATEGORIES.map((slot) => ({
    category: slot.category,
    families: byCategory.get(slot.category) ?? [],
  }));
}

function encodePersisted(value: PersistedCatalog): string {
  return JSON.stringify(value);
}

function decodePersisted(raw: string): PersistedCatalog {
  if (raw.trim().length === 0) {
    return { syncedAt: null, categories: EMPTY_CATEGORIES };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { syncedAt: null, categories: EMPTY_CATEGORIES };
    }
    const syncedAt = typeof parsed.syncedAt === 'string' ? parsed.syncedAt : null;
    return {
      syncedAt,
      categories: parsePersistedCategories(parsed.categories),
    };
  } catch {
    return { syncedAt: null, categories: EMPTY_CATEGORIES };
  }
}

/** Persistent catalog payload (survives reloads). */
export const futuresCatalogPersistent = persistentAtom<PersistedCatalog>(
  'moex:futures-catalog:v1',
  { syncedAt: null, categories: EMPTY_CATEGORIES },
  {
    encode: encodePersisted,
    decode: decodePersisted,
  },
);

/** Ephemeral load status (not persisted). */
export const futuresCatalogStatus = atom<{
  status: FuturesCatalogStatus;
  error: string | null;
}>({ status: 'idle', error: null });

export function readFuturesCatalogState(): FuturesCatalogState {
  const persisted = futuresCatalogPersistent.get();
  const status = futuresCatalogStatus.get();
  return {
    syncedAt: persisted.syncedAt,
    categories: persisted.categories,
    status: status.status,
    error: status.error,
  };
}

export function familiesForCategory(
  categories: FuturesCatalogResponse['categories'],
  category: FuturesListCategory,
) {
  const bucket = categories.find((item) => item.category === category);
  return bucket?.families ?? [];
}

let refreshInflight: Promise<void> | null = null;

/**
 * Load catalog into the persistent store. Uses cached data immediately;
 * network refresh is singleflight and updates the store in the background.
 */
export async function refreshFuturesCatalog(client: ChartApiClient): Promise<void> {
  const current = futuresCatalogPersistent.get();
  const hasCache = current.categories.some((bucket) => bucket.families.length > 0);
  futuresCatalogStatus.set({
    status: hasCache ? 'refreshing' : 'loading',
    error: null,
  });

  if (refreshInflight !== null) {
    await refreshInflight;
    return;
  }

  refreshInflight = (async () => {
    try {
      const catalog = await client.listFuturesCatalog();
      futuresCatalogPersistent.set({
        syncedAt: catalog.syncedAt,
        categories: catalog.categories,
      });
      futuresCatalogStatus.set({ status: 'idle', error: null });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load futures list';
      futuresCatalogStatus.set({
        status: hasCache ? 'idle' : 'error',
        error: message,
      });
      if (!hasCache) {
        throw error;
      }
    } finally {
      refreshInflight = null;
    }
  })();

  await refreshInflight;
}
