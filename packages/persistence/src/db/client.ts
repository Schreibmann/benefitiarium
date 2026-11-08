/**
 * Transaction boundary (BL-021):
 * - One business command = one `withTransaction` callback.
 * - Repositories must not open nested transactions; they receive a `DbExecutor`
 *   that is either the root client or the active transaction client.
 * - Outbox/audit writes that belong to the same aggregate change must use the
 *   same executor passed into the transaction callback (see BL-022/023).
 */

export type SqlValue = string | number | boolean | null;

export type DbExecutor = {
  /** Run a SQL statement that returns JSON rows (array). */
  queryJson: <T>(sql: string, params?: SqlValue[]) => Promise<T[]>;
  /** Run a SQL statement that returns a single JSON value (object/array/scalar). */
  queryJsonValue: <T>(sql: string, params?: SqlValue[]) => Promise<T>;
  /** Run a SQL statement with no result set (INSERT/UPDATE/DDL helpers). */
  execute: (sql: string, params?: SqlValue[]) => Promise<void>;
};

export type DbClient = DbExecutor & {
  withTransaction: <T>(fn: (tx: DbExecutor) => Promise<T>) => Promise<T>;
  close?: () => Promise<void>;
};
