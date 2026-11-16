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
export const MIGRATION_FILES = [
  '000_schema_migrations.sql',
  '001_init.sql',
  '002_audit_append_only.sql',
  '003_futures_catalog_cache.sql',
  '004_live_runtime.sql',
  '005_market_signals_notifications.sql',
  '006_notifications_forum_topics.sql',
] as const;

export type { MemoryAuditLogStore } from './audit/memory.js';
export { createMemoryAuditLogStore } from './audit/memory.js';
export { REDACTED, redactAuditPayload } from './audit/redact.js';
export type { AuditLogRepository } from './audit/repository.js';
export { createAuditLogRepository } from './audit/repository.js';
export type { AuditLogService } from './audit/service.js';
export { createAuditLogService } from './audit/service.js';
export type {
  AuditActorType,
  AuditEntry,
  AuditResult,
  NewAuditEntry,
} from './audit/types.js';
export type { DbClient, DbExecutor, SqlValue } from './db/client.js';
export type { PsqlClientOptions } from './db/psql-client.js';
export { createPsqlDbClient, runAtomicSqlScript, runPsqlRaw } from './db/psql-client.js';
export { bindSql, jsonAggSql, toSqlLiteral } from './db/sql.js';
export type { MemoryOutboxStore } from './outbox/memory.js';
export { createMemoryOutboxStore } from './outbox/memory.js';
export type {
  OutboxDelivery,
  OutboxPublisher,
  OutboxPublisherOptions,
  SeenEventStore,
} from './outbox/publisher.js';
export {
  createIdempotentOutboxHandler,
  createMemorySeenEventStore,
  createOutboxPublisher,
} from './outbox/publisher.js';
export type { OutboxRepository } from './outbox/repository.js';
export { createOutboxRepository } from './outbox/repository.js';
export type { NewOutboxEvent, OutboxEvent } from './outbox/types.js';
export type { BrokerAccountRepository } from './repos/broker-accounts.js';
export { createBrokerAccountRepository } from './repos/broker-accounts.js';
export type { FavoriteRow, FavoritesRepository } from './repos/favorites.js';
export {
  createFavoritesRepository,
  createMemoryFavoritesRepository,
} from './repos/favorites.js';
export type {
  FuturesCatalogCacheRepository,
  FuturesCatalogCacheRow,
  FuturesCatalogListCategory,
} from './repos/futures-catalog-cache.js';
export {
  createFuturesCatalogCacheRepository,
  createMemoryFuturesCatalogCacheRepository,
} from './repos/futures-catalog-cache.js';
export type { InstrumentSpecRepository } from './repos/instrument-specs.js';
export { createInstrumentSpecRepository } from './repos/instrument-specs.js';
export type { CatalogProvider, InstrumentRepository } from './repos/instruments.js';
export { createInstrumentRepository } from './repos/instruments.js';
export type {
  LiveDesiredStatus,
  LiveRuntimeStateRepository,
  LiveRuntimeStateRow,
} from './repos/live-runtime-state.js';
export {
  createLiveRuntimeStateRepository,
  createMemoryLiveRuntimeStateRepository,
} from './repos/live-runtime-state.js';
export type {
  LiveSignalDirection,
  LiveSignalRow,
  LiveSignalStatus,
  LiveSignalsRepository,
  NewLiveSignal,
} from './repos/live-signals.js';
export {
  createLiveSignalsRepository,
  createMemoryLiveSignalsRepository,
} from './repos/live-signals.js';
export type { MarketSignalsRepository } from './repos/market-signals.js';
export { createMarketSignalsRepository } from './repos/market-signals.js';
export type { MemoryMarketSignalsStore } from './repos/market-signals-memory.js';
export { createMemoryMarketSignalsStore } from './repos/market-signals-memory.js';
export type {
  ApproachStateRow,
  InsertSignalWithNotificationResult,
  MarketSignal,
  MarketSignalEvalMode,
  MarketSignalKind,
  MarketSignalSide,
  NewLogNotification,
  NewMarketSignal,
  NewNotificationForSignal,
  Notification,
  NotificationChannel,
  NotificationStatus,
} from './repos/market-signals-types.js';
export type { PersistedSandboxCommandRequest } from './repos/sandbox-command-request.js';
export { parsePersistedSandboxCommandRequest } from './repos/sandbox-command-request.js';
export type { SandboxOperationRepository } from './repos/sandbox-operations.js';
export { createSandboxOperationRepository } from './repos/sandbox-operations.js';
