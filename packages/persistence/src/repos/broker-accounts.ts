import type { SandboxAccount, UUID } from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import { mapSandboxAccountRow } from './mappers.js';

export type BrokerAccountRepository = {
  listSandbox: () => Promise<SandboxAccount[]>;
  getById: (id: UUID) => Promise<SandboxAccount | null>;
  getByProviderAccountId: (providerAccountId: string) => Promise<SandboxAccount | null>;
  upsertSandbox: (account: SandboxAccount) => Promise<SandboxAccount>;
};

const SANDBOX_SELECT = `
  SELECT
    id::text AS "id",
    provider_account_id AS "providerAccountId",
    display_name AS "displayName",
    COALESCE(provider_status, 'unknown') AS "providerStatus",
    local_status AS "localStatus",
    opened_at AS "openedAt",
    closed_at AS "closedAt",
    last_verified_at AS "lastVerifiedAt"
  FROM broker_accounts
  WHERE provider = 't-invest' AND environment = 'sandbox'
`;

export function createBrokerAccountRepository(db: DbExecutor): BrokerAccountRepository {
  return {
    listSandbox: async () => {
      const rows = await db.queryJson(jsonAggSql(`${SANDBOX_SELECT} ORDER BY updated_at DESC`));
      return rows.map(mapSandboxAccountRow);
    },

    getById: async (id) => {
      const rows = await db.queryJson(jsonAggSql(`${SANDBOX_SELECT} AND id = $1::uuid`), [id]);
      const first = rows[0];
      return first === undefined ? null : mapSandboxAccountRow(first);
    },

    getByProviderAccountId: async (providerAccountId) => {
      const rows = await db.queryJson(
        jsonAggSql(`${SANDBOX_SELECT} AND provider_account_id = $1`),
        [providerAccountId],
      );
      const first = rows[0];
      return first === undefined ? null : mapSandboxAccountRow(first);
    },

    upsertSandbox: async (account) => {
      if (account.environment !== 'sandbox') {
        throw new Error('upsertSandbox only accepts environment=sandbox');
      }
      const row = await db.queryJsonValue(
        `
        WITH upserted AS (
          INSERT INTO broker_accounts (
            id, provider, environment, provider_account_id, display_name,
            provider_status, local_status, is_active,
            opened_at, closed_at, last_verified_at, updated_at
          ) VALUES (
            $1::uuid, 't-invest', 'sandbox', $2, $3,
            $4, $5, TRUE,
            $6::timestamptz, $7::timestamptz, $8::timestamptz, now()
          )
          ON CONFLICT (provider, environment, provider_account_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            provider_status = EXCLUDED.provider_status,
            local_status = EXCLUDED.local_status,
            opened_at = EXCLUDED.opened_at,
            closed_at = EXCLUDED.closed_at,
            last_verified_at = EXCLUDED.last_verified_at,
            updated_at = now()
          RETURNING
            id::text AS "id",
            provider_account_id AS "providerAccountId",
            display_name AS "displayName",
            COALESCE(provider_status, 'unknown') AS "providerStatus",
            local_status AS "localStatus",
            opened_at AS "openedAt",
            closed_at AS "closedAt",
            last_verified_at AS "lastVerifiedAt"
        )
        SELECT row_to_json(upserted) FROM upserted
        `.trim(),
        [
          account.id,
          account.providerAccountId,
          account.displayName,
          account.providerStatus,
          account.localStatus,
          account.openedAt,
          account.closedAt,
          account.lastVerifiedAt,
        ],
      );
      return mapSandboxAccountRow(row);
    },
  };
}
