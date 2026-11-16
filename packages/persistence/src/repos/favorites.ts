import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';

export type FavoriteRow = {
  instrumentUid: string;
  ticker: string;
  figi: string | null;
  createdAt: string;
};

export type FavoritesRepository = {
  list: () => Promise<FavoriteRow[]>;
  get: (instrumentUid: string) => Promise<FavoriteRow | null>;
  upsert: (input: {
    instrumentUid: string;
    ticker: string;
    figi?: string | null;
  }) => Promise<FavoriteRow>;
  remove: (instrumentUid: string) => Promise<boolean>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapRow(value: unknown): FavoriteRow {
  if (!isRecord(value)) {
    throw new Error('Invalid favorites row');
  }
  const instrumentUid = value.instrumentUid;
  const ticker = value.ticker;
  const createdAt = value.createdAt;
  if (
    typeof instrumentUid !== 'string' ||
    typeof ticker !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    throw new Error('Invalid favorites identity fields');
  }
  const figi = value.figi;
  return {
    instrumentUid,
    ticker,
    figi: typeof figi === 'string' ? figi : null,
    createdAt,
  };
}

const FAVORITE_COLS = `
  instrument_uid AS "instrumentUid",
  ticker,
  figi,
  created_at AS "createdAt"
`;

export function createFavoritesRepository(db: DbExecutor): FavoritesRepository {
  return {
    async list() {
      const rows = await db.queryJson(
        jsonAggSql(`SELECT ${FAVORITE_COLS} FROM favorites ORDER BY created_at DESC`),
      );
      return rows.map(mapRow);
    },

    async get(instrumentUid) {
      const rows = await db.queryJson(
        jsonAggSql(`SELECT ${FAVORITE_COLS} FROM favorites WHERE instrument_uid = $1`),
        [instrumentUid],
      );
      const first = rows[0];
      return first === undefined ? null : mapRow(first);
    },

    async upsert(input) {
      const figi = input.figi ?? null;
      const row = await db.queryJsonValue(
        `
        WITH upserted AS (
          INSERT INTO favorites (instrument_uid, ticker, figi)
          VALUES ($1, $2, $3)
          ON CONFLICT (instrument_uid) DO UPDATE SET
            ticker = EXCLUDED.ticker,
            figi = EXCLUDED.figi
          RETURNING ${FAVORITE_COLS}
        )
        SELECT row_to_json(upserted) FROM upserted
        `.trim(),
        [input.instrumentUid, input.ticker, figi],
      );
      return mapRow(row);
    },

    async remove(instrumentUid) {
      const row = await db.queryJsonValue(
        `
        WITH deleted AS (
          DELETE FROM favorites WHERE instrument_uid = $1
          RETURNING ${FAVORITE_COLS}
        )
        SELECT row_to_json(deleted) FROM deleted
        `.trim(),
        [instrumentUid],
      );
      return row !== null && row !== undefined;
    },
  };
}

export function createMemoryFavoritesRepository(seed: FavoriteRow[] = []): FavoritesRepository {
  const byUid = new Map<string, FavoriteRow>(seed.map((row) => [row.instrumentUid, row]));

  return {
    async list() {
      return [...byUid.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async get(instrumentUid) {
      return byUid.get(instrumentUid) ?? null;
    },

    async upsert(input) {
      const existing = byUid.get(input.instrumentUid);
      const row: FavoriteRow = {
        instrumentUid: input.instrumentUid,
        ticker: input.ticker,
        figi: input.figi ?? null,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      byUid.set(input.instrumentUid, row);
      return row;
    },

    async remove(instrumentUid) {
      return byUid.delete(instrumentUid);
    },
  };
}
