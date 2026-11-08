import type { InstrumentId, InstrumentSpec, IsoDateTime } from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import { mapInstrumentSpecRow } from './mappers.js';

export type InstrumentSpecRepository = {
  listForInstrument: (instrumentId: InstrumentId) => Promise<InstrumentSpec[]>;
  getActiveAt: (instrumentId: InstrumentId, asOf: IsoDateTime) => Promise<InstrumentSpec | null>;
  /**
   * Insert a new half-open version. If an open-ended row exists, closes it at
   * `spec.validFrom` in the same SQL statement (atomic CTE).
   */
  appendVersion: (spec: InstrumentSpec) => Promise<InstrumentSpec>;
};

const SPEC_PROJECTION = `
  instrument_id::text AS "instrumentId",
  valid_from AS "validFrom",
  valid_to AS "validTo",
  lot_size AS "lotSize",
  min_price_increment::text AS "minPriceIncrement",
  price_currency AS "priceCurrency",
  price_type AS "priceType",
  contract_multiplier::text AS "contractMultiplier",
  expiration_at AS "expirationAt",
  margin_initial::text AS "marginInitial",
  underlying_provider_position_uid AS "underlyingProviderPositionUid",
  underlying_asset_type AS "underlyingAssetType",
  underlying_asset_name AS "underlyingAssetName",
  contract_family AS "contractFamily",
  price_unit AS "priceUnit",
  min_price_increment_amount::text AS "minPriceIncrementAmount",
  raw
`;

export function createInstrumentSpecRepository(db: DbExecutor): InstrumentSpecRepository {
  return {
    listForInstrument: async (instrumentId) => {
      const rows = await db.queryJson(
        jsonAggSql(`
          SELECT ${SPEC_PROJECTION}
          FROM instrument_specs
          WHERE instrument_id = $1::uuid
          ORDER BY valid_from ASC
        `),
        [instrumentId],
      );
      return rows.map(mapInstrumentSpecRow);
    },

    getActiveAt: async (instrumentId, asOf) => {
      const rows = await db.queryJson(
        jsonAggSql(`
          SELECT ${SPEC_PROJECTION}
          FROM instrument_specs
          WHERE instrument_id = $1::uuid
            AND valid_from <= $2::timestamptz
            AND (valid_to IS NULL OR valid_to > $2::timestamptz)
          ORDER BY valid_from DESC
          LIMIT 1
        `),
        [instrumentId, asOf],
      );
      const first = rows[0];
      return first === undefined ? null : mapInstrumentSpecRow(first);
    },

    appendVersion: async (spec) => {
      const rawJson = JSON.stringify(spec.raw);
      const row = await db.queryJsonValue(
        `
        WITH closed AS (
          UPDATE instrument_specs
          SET valid_to = $2::timestamptz
          WHERE instrument_id = $1::uuid
            AND valid_to IS NULL
            AND valid_from < $2::timestamptz
          RETURNING id
        ),
        inserted AS (
          INSERT INTO instrument_specs (
            instrument_id, valid_from, valid_to, lot_size, min_price_increment,
            price_currency, price_type, contract_multiplier, expiration_at, margin_initial,
            underlying_provider_position_uid, underlying_asset_type, underlying_asset_name,
            contract_family, price_unit, min_price_increment_amount, raw
          ) VALUES (
            $1::uuid, $2::timestamptz, $3::timestamptz, $4, $5::numeric,
            $6, $7, $8::numeric, $9::timestamptz, $10::numeric,
            $11, $12, $13, $14, $15, $16::numeric, $17::jsonb
          )
          RETURNING ${SPEC_PROJECTION}
        )
        SELECT row_to_json(inserted) FROM inserted
        `.trim(),
        [
          spec.instrumentId,
          spec.validFrom,
          spec.validTo,
          spec.lotSize,
          spec.minPriceIncrement,
          spec.priceCurrency,
          spec.priceType,
          spec.contractMultiplier,
          spec.expirationAt,
          spec.marginInitial,
          spec.underlyingProviderPositionUid ?? null,
          spec.underlyingAssetType ?? null,
          spec.underlyingAssetName ?? null,
          spec.contractFamily ?? null,
          spec.priceUnit ?? null,
          spec.minPriceIncrementAmount ?? null,
          rawJson,
        ],
      );
      return mapInstrumentSpecRow(row);
    },
  };
}
