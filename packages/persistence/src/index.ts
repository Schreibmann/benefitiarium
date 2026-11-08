/**
 * Persistence package (BL-020 / BL-021).
 *
 * SQL migrations: `../migrations` via `pnpm db:migrate`.
 * Domain must not import Drizzle; repositories sit behind ports below.
 *
 * Transaction boundary:
 * - Prefer one business command = one repository method implemented as a
 *   single SQL statement (or CTE) so it is atomic under the psql/docker client.
 * - `DbClient.withTransaction` currently delegates without a shared session
 *   when using docker exec; use `runAtomicSqlScript` for multi-statement needs
 *   until a real driver session is available.
 */

export const packageName = '@moex/persistence' as const;

/** Ordered migration ids shipped with this package. */
export const MIGRATION_FILES = ['000_schema_migrations.sql', '001_init.sql'] as const;

export type { DbClient, DbExecutor, SqlValue } from './db/client.js';
export type { PsqlClientOptions } from './db/psql-client.js';
export { createPsqlDbClient, runAtomicSqlScript, runPsqlRaw } from './db/psql-client.js';
export { bindSql, jsonAggSql, toSqlLiteral } from './db/sql.js';
export type { BrokerAccountRepository } from './repos/broker-accounts.js';
export { createBrokerAccountRepository } from './repos/broker-accounts.js';
export type { InstrumentSpecRepository } from './repos/instrument-specs.js';
export { createInstrumentSpecRepository } from './repos/instrument-specs.js';
export type { CatalogProvider, InstrumentRepository } from './repos/instruments.js';
export { createInstrumentRepository } from './repos/instruments.js';
export type { SandboxOperationRepository } from './repos/sandbox-operations.js';
export { createSandboxOperationRepository } from './repos/sandbox-operations.js';
