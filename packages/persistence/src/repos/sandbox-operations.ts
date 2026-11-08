import type { SandboxAccountOperation, UUID } from '@moex/domain';
import type { DbExecutor } from '../db/client.js';
import { jsonAggSql } from '../db/sql.js';
import { mapSandboxOperationRow } from './mappers.js';

export type SandboxOperationRepository = {
  getById: (id: UUID) => Promise<SandboxAccountOperation | null>;
  findByIdempotencyKey: (key: string) => Promise<SandboxAccountOperation | null>;
  list: () => Promise<SandboxAccountOperation[]>;
  append: (operation: SandboxAccountOperation) => Promise<SandboxAccountOperation>;
  update: (operation: SandboxAccountOperation) => Promise<SandboxAccountOperation>;
};

const OP_SELECT = `
  SELECT
    id::text AS "id",
    account_id::text AS "accountId",
    operation_type AS "type",
    status,
    idempotency_key AS "idempotencyKey",
    correlation_id AS "correlationId",
    created_at AS "createdAt",
    completed_at AS "completedAt",
    error_message AS "errorMessage",
    request_hash AS "requestHash"
  FROM sandbox_account_operations
  WHERE provider = 't-invest'
`;

const OP_JSON = `
  id::text AS "id",
  account_id::text AS "accountId",
  operation_type AS "type",
  status,
  idempotency_key AS "idempotencyKey",
  correlation_id AS "correlationId",
  created_at AS "createdAt",
  completed_at AS "completedAt",
  error_message AS "errorMessage",
  request_hash AS "requestHash"
`;

export function createSandboxOperationRepository(db: DbExecutor): SandboxOperationRepository {
  return {
    getById: async (id) => {
      const rows = await db.queryJson(jsonAggSql(`${OP_SELECT} AND id = $1::uuid`), [id]);
      const first = rows[0];
      return first === undefined ? null : mapSandboxOperationRow(first);
    },

    findByIdempotencyKey: async (key) => {
      const rows = await db.queryJson(jsonAggSql(`${OP_SELECT} AND idempotency_key = $1`), [key]);
      const first = rows[0];
      return first === undefined ? null : mapSandboxOperationRow(first);
    },

    list: async () => {
      const rows = await db.queryJson(jsonAggSql(`${OP_SELECT} ORDER BY created_at ASC`));
      return rows.map(mapSandboxOperationRow);
    },

    append: async (operation) => {
      const existing = await db.queryJson(jsonAggSql(`${OP_SELECT} AND idempotency_key = $1`), [
        operation.idempotencyKey,
      ]);
      if (existing[0] !== undefined) {
        throw new Error(`Duplicate idempotency key: ${operation.idempotencyKey}`);
      }
      const row = await db.queryJsonValue(
        `
        WITH inserted AS (
          INSERT INTO sandbox_account_operations (
            id, provider, account_id, operation_type, status,
            idempotency_key, request_hash, correlation_id,
            error_message, created_at, updated_at, completed_at
          ) VALUES (
            $1::uuid, 't-invest', $2::uuid, $3, $4,
            $5, $6, $7,
            $8, $9::timestamptz, now(), $10::timestamptz
          )
          RETURNING ${OP_JSON}
        )
        SELECT row_to_json(inserted) FROM inserted
        `.trim(),
        [
          operation.id,
          operation.accountId,
          operation.type,
          operation.status,
          operation.idempotencyKey,
          operation.requestHash ?? '',
          operation.correlationId,
          operation.errorMessage ?? null,
          operation.createdAt,
          operation.completedAt,
        ],
      );
      return mapSandboxOperationRow(row);
    },

    update: async (operation) => {
      const row = await db.queryJsonValue(
        `
        WITH updated AS (
          UPDATE sandbox_account_operations SET
            account_id = $2::uuid,
            status = $3,
            error_message = $4,
            request_hash = COALESCE(NULLIF($5, ''), request_hash),
            completed_at = $6::timestamptz,
            updated_at = now()
          WHERE id = $1::uuid AND provider = 't-invest'
          RETURNING ${OP_JSON}
        )
        SELECT row_to_json(updated) FROM updated
        `.trim(),
        [
          operation.id,
          operation.accountId,
          operation.status,
          operation.errorMessage ?? null,
          operation.requestHash ?? '',
          operation.completedAt,
        ],
      );
      return mapSandboxOperationRow(row);
    },
  };
}
