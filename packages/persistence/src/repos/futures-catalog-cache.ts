import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';

export type FuturesCatalogListCategory =
  | 'commodity'
  | 'equity_index'
  | 'currency'
  | 'share'
  | 'other';

export type FuturesCatalogCacheRow = {
  provider: 't-invest';
  providerInstrumentId: string;
  ticker: string;
  name: string;
  classCode: string | null;
  sector: string;
  assetTypeRaw: string | null;
  basicAsset: string | null;
  contractFamily: string | null;
  expirationAt: string | null;
  isActive: boolean;
  listCategory: FuturesCatalogListCategory;
  syncedAt: string;
};

export type FuturesCatalogCacheRepository = {
  replaceAll: (provider: 't-invest', rows: FuturesCatalogCacheRow[]) => Promise<void>;
  listActiveByCategory: (
    provider: 't-invest',
    listCategory: Exclude<FuturesCatalogListCategory, 'other'>,
  ) => Promise<FuturesCatalogCacheRow[]>;
  listActive: (provider: 't-invest') => Promise<FuturesCatalogCacheRow[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapRow(value: unknown): FuturesCatalogCacheRow {
  if (!isRecord(value)) {
    throw new Error('Invalid futures_catalog_cache row');
  }
  const record = value;
  const provider = record.provider;
  const listCategory = record.listCategory;
  if (provider !== 't-invest') {
    throw new Error('Invalid futures catalog provider');
  }
  if (
    listCategory !== 'commodity' &&
    listCategory !== 'equity_index' &&
    listCategory !== 'currency' &&
    listCategory !== 'share' &&
    listCategory !== 'other'
  ) {
    throw new Error('Invalid futures catalog listCategory');
  }
  const providerInstrumentId = record.providerInstrumentId;
  const ticker = record.ticker;
  const name = record.name;
  const syncedAt = record.syncedAt;
  if (
    typeof providerInstrumentId !== 'string' ||
    typeof ticker !== 'string' ||
    typeof name !== 'string' ||
    typeof syncedAt !== 'string'
  ) {
    throw new Error('Invalid futures catalog identity fields');
  }
  const classCode = record.classCode;
  const sector = record.sector;
  const assetTypeRaw = record.assetTypeRaw;
  const basicAsset = record.basicAsset;
  const contractFamily = record.contractFamily;
  const expirationAt = record.expirationAt;
  return {
    provider,
    providerInstrumentId,
    ticker,
    name,
    classCode: typeof classCode === 'string' ? classCode : null,
    sector: typeof sector === 'string' ? sector : '',
    assetTypeRaw: typeof assetTypeRaw === 'string' ? assetTypeRaw : null,
    basicAsset: typeof basicAsset === 'string' ? basicAsset : null,
    contractFamily: typeof contractFamily === 'string' ? contractFamily : null,
    expirationAt: typeof expirationAt === 'string' ? expirationAt : null,
    isActive: record.isActive === true,
    listCategory,
    syncedAt,
  };
}

const SELECT_COLS = `
  provider,
  provider_instrument_id AS "providerInstrumentId",
  ticker,
  name,
  class_code AS "classCode",
  sector,
  asset_type_raw AS "assetTypeRaw",
  basic_asset AS "basicAsset",
  contract_family AS "contractFamily",
  CASE WHEN expiration_at IS NULL THEN NULL ELSE expiration_at::text END AS "expirationAt",
  is_active AS "isActive",
  list_category AS "listCategory",
  synced_at::text AS "syncedAt"
`;

const UPSERT_CHUNK_SIZE = 40;

function buildUpsertValuesSql(rowCount: number): string {
  return Array.from({ length: rowCount }, (_row, index) => {
    // 13 bind params per row (provider … synced_at).
    const base = index * 13;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}::timestamptz, $${base + 11}, $${base + 12}, $${base + 13}::timestamptz)`;
  }).join(',\n');
}

export function createFuturesCatalogCacheRepository(db: DbExecutor): FuturesCatalogCacheRepository {
  return {
    replaceAll: async (provider, rows) => {
      const syncedAt = new Date().toISOString();

      if (rows.length === 0) {
        await db.execute(`DELETE FROM futures_catalog_cache WHERE provider = $1`, [provider]);
        return;
      }

      for (let offset = 0; offset < rows.length; offset += UPSERT_CHUNK_SIZE) {
        const chunk = rows.slice(offset, offset + UPSERT_CHUNK_SIZE);
        const params: Array<string | boolean | null> = [];
        for (const row of chunk) {
          params.push(
            provider,
            row.providerInstrumentId,
            row.ticker,
            row.name,
            row.classCode,
            row.sector,
            row.assetTypeRaw,
            row.basicAsset,
            row.contractFamily,
            row.expirationAt,
            row.isActive,
            row.listCategory,
            syncedAt,
          );
        }

        await db.execute(
          `
          INSERT INTO futures_catalog_cache (
            provider,
            provider_instrument_id,
            ticker,
            name,
            class_code,
            sector,
            asset_type_raw,
            basic_asset,
            contract_family,
            expiration_at,
            is_active,
            list_category,
            synced_at
          ) VALUES
          ${buildUpsertValuesSql(chunk.length)}
          ON CONFLICT (provider, provider_instrument_id) DO UPDATE SET
            ticker = EXCLUDED.ticker,
            name = EXCLUDED.name,
            class_code = EXCLUDED.class_code,
            sector = EXCLUDED.sector,
            asset_type_raw = EXCLUDED.asset_type_raw,
            basic_asset = EXCLUDED.basic_asset,
            contract_family = EXCLUDED.contract_family,
            expiration_at = EXCLUDED.expiration_at,
            is_active = EXCLUDED.is_active,
            list_category = EXCLUDED.list_category,
            synced_at = EXCLUDED.synced_at
          `.trim(),
          params,
        );
      }

      await db.execute(
        `
        DELETE FROM futures_catalog_cache
        WHERE provider = $1
          AND synced_at IS DISTINCT FROM $2::timestamptz
        `.trim(),
        [provider, syncedAt],
      );
    },

    listActiveByCategory: async (provider, listCategory) => {
      const rows = await db.queryJson(
        jsonAggSql(`
          SELECT ${SELECT_COLS}
          FROM futures_catalog_cache
          WHERE provider = $1
            AND is_active = TRUE
            AND list_category = $2
          ORDER BY contract_family NULLS LAST, expiration_at NULLS LAST, ticker
        `),
        [provider, listCategory],
      );
      return rows.map(mapRow);
    },

    listActive: async (provider) => {
      const rows = await db.queryJson(
        jsonAggSql(`
          SELECT ${SELECT_COLS}
          FROM futures_catalog_cache
          WHERE provider = $1
            AND is_active = TRUE
          ORDER BY list_category, contract_family NULLS LAST, expiration_at NULLS LAST, ticker
        `),
        [provider],
      );
      return rows.map(mapRow);
    },
  };
}

export function createMemoryFuturesCatalogCacheRepository(): FuturesCatalogCacheRepository {
  let rows: FuturesCatalogCacheRow[] = [];
  return {
    replaceAll: async (_provider, next) => {
      const syncedAt = new Date().toISOString();
      rows = next.map((row) => ({ ...row, syncedAt }));
    },
    listActiveByCategory: async (_provider, listCategory) =>
      rows.filter((row) => row.isActive && row.listCategory === listCategory),
    listActive: async () => rows.filter((row) => row.isActive),
  };
}
