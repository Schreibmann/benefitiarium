import type {
  AssetType,
  DataProvider,
  Instrument,
  InstrumentId,
  InstrumentProviderId,
} from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import { mapInstrumentRow } from './mappers.js';

/** Providers allowed by `instrument_provider_ids` CHECK (excludes domain `paper`). */
export type CatalogProvider = Exclude<DataProvider, 'paper'>;

export type InstrumentRepository = {
  getById: (id: InstrumentId) => Promise<Instrument | null>;
  findByTicker: (ticker: string, assetType?: AssetType) => Promise<Instrument[]>;
  upsert: (instrument: Instrument) => Promise<Instrument>;
  findByProviderInstrumentId: (
    provider: CatalogProvider,
    providerInstrumentId: string,
  ) => Promise<Instrument | null>;
  linkProviderId: (link: InstrumentProviderId & { raw?: Record<string, unknown> }) => Promise<void>;
};

const INSTRUMENT_SELECT = `
  SELECT
    id::text AS "id",
    asset_type AS "assetType",
    ticker,
    name,
    exchange,
    currency,
    is_active AS "isActive"
  FROM instruments
`;

export function createInstrumentRepository(db: DbExecutor): InstrumentRepository {
  return {
    getById: async (id) => {
      const rows = await db.queryJson(jsonAggSql(`${INSTRUMENT_SELECT} WHERE id = $1::uuid`), [id]);
      const first = rows[0];
      return first === undefined ? null : mapInstrumentRow(first);
    },

    findByTicker: async (ticker, assetType) => {
      const sql =
        assetType === undefined
          ? jsonAggSql(`${INSTRUMENT_SELECT} WHERE ticker = $1 ORDER BY asset_type, name`)
          : jsonAggSql(`${INSTRUMENT_SELECT} WHERE ticker = $1 AND asset_type = $2 ORDER BY name`);
      const params = assetType === undefined ? [ticker] : [ticker, assetType];
      const rows = await db.queryJson(sql, params);
      return rows.map(mapInstrumentRow);
    },

    upsert: async (instrument) => {
      const row = await db.queryJsonValue(
        `
        WITH upserted AS (
          INSERT INTO instruments (
            id, asset_type, ticker, name, exchange, currency, is_active, updated_at
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, now()
          )
          ON CONFLICT (id) DO UPDATE SET
            asset_type = EXCLUDED.asset_type,
            ticker = EXCLUDED.ticker,
            name = EXCLUDED.name,
            exchange = EXCLUDED.exchange,
            currency = EXCLUDED.currency,
            is_active = EXCLUDED.is_active,
            updated_at = now()
          RETURNING
            id::text AS "id",
            asset_type AS "assetType",
            ticker,
            name,
            exchange,
            currency,
            is_active AS "isActive"
        )
        SELECT row_to_json(upserted) FROM upserted
        `.trim(),
        [
          instrument.id,
          instrument.assetType,
          instrument.ticker,
          instrument.name,
          instrument.exchange,
          instrument.currency,
          instrument.isActive,
        ],
      );
      return mapInstrumentRow(row);
    },

    findByProviderInstrumentId: async (provider, providerInstrumentId) => {
      const rows = await db.queryJson(
        jsonAggSql(`
          SELECT
            i.id::text AS "id",
            i.asset_type AS "assetType",
            i.ticker,
            i.name,
            i.exchange,
            i.currency,
            i.is_active AS "isActive"
          FROM instrument_provider_ids p
          INNER JOIN instruments i ON i.id = p.instrument_id
          WHERE p.provider = $1 AND p.provider_instrument_id = $2
        `),
        [provider, providerInstrumentId],
      );
      const first = rows[0];
      return first === undefined ? null : mapInstrumentRow(first);
    },

    linkProviderId: async (link) => {
      if (link.provider === 'paper') {
        throw new Error('paper provider cannot be persisted in instrument_provider_ids');
      }
      const rawJson = JSON.stringify(link.raw ?? {});
      await db.execute(
        `
        INSERT INTO instrument_provider_ids (
          instrument_id, provider, provider_instrument_id,
          engine, market, board, secid, class_code, is_primary, raw
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
        )
        ON CONFLICT (provider, provider_instrument_id) DO UPDATE SET
          instrument_id = EXCLUDED.instrument_id,
          engine = EXCLUDED.engine,
          market = EXCLUDED.market,
          board = EXCLUDED.board,
          secid = EXCLUDED.secid,
          class_code = EXCLUDED.class_code,
          is_primary = EXCLUDED.is_primary,
          raw = EXCLUDED.raw
        `.trim(),
        [
          link.instrumentId,
          link.provider,
          link.providerInstrumentId,
          link.engine ?? null,
          link.market ?? null,
          link.board ?? null,
          link.secid ?? null,
          link.classCode ?? null,
          link.isPrimary,
          rawJson,
        ],
      );
    },
  };
}
