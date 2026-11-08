import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbClient, DbExecutor } from './client.js';
import { bindSql } from './sql.js';

export type PsqlClientOptions = {
  databaseUrl?: string;
  dockerService?: string;
  dockerComposeFile?: string;
  database?: string;
  user?: string;
};

type PsqlResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function repoRootFromHere(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../..');
}

function resolveComposeFile(options: PsqlClientOptions): string {
  if (options.dockerComposeFile !== undefined) {
    return options.dockerComposeFile;
  }
  return join(repoRootFromHere(), 'docker-compose.yml');
}

export function runPsqlRaw(sql: string, options: PsqlClientOptions = {}): PsqlResult {
  const databaseUrl = (options.databaseUrl ?? process.env.DATABASE_URL ?? '').trim();
  if (databaseUrl.length > 0) {
    const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    const err = result.error;
    const missingPsql = err !== undefined && 'code' in err && err.code === 'ENOENT';
    if (!missingPsql) {
      return {
        status: result.status,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      };
    }
  }

  const composePath = resolveComposeFile(options);
  if (!existsSync(composePath)) {
    return {
      status: 1,
      stdout: '',
      stderr: `docker-compose.yml not found at ${composePath} and psql/DATABASE_URL unavailable`,
    };
  }

  const result = spawnSync(
    'docker',
    [
      'compose',
      '-f',
      composePath,
      'exec',
      '-T',
      options.dockerService ?? 'postgres',
      'psql',
      '-U',
      options.user ?? 'postgres',
      '-d',
      options.database ?? 'moex',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-c',
      sql,
    ],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function assertOk(result: PsqlResult, sql: string): void {
  if (result.status === 0) {
    return;
  }
  const detail = `${result.stderr}\n${result.stdout}`.trim();
  throw new Error(`psql failed (${result.status}): ${detail}\nSQL: ${sql.slice(0, 400)}`);
}

function firstJsonLine(stdout: string): string {
  const line = stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0);
  if (line === undefined) {
    throw new Error('Expected JSON output, got empty stdout');
  }
  return line;
}

function createExecutor(options: PsqlClientOptions): DbExecutor {
  return {
    execute: async (sql, params = []) => {
      const bound = bindSql(sql, params);
      assertOk(runPsqlRaw(bound, options), bound);
    },
    queryJsonValue: async (sql, params = []) => {
      const bound = bindSql(sql, params);
      const result = runPsqlRaw(bound, options);
      assertOk(result, bound);
      return JSON.parse(firstJsonLine(result.stdout));
    },
    queryJson: async (sql, params = []) => {
      const bound = bindSql(sql, params);
      const result = runPsqlRaw(bound, options);
      assertOk(result, bound);
      if (result.stdout.trim().length === 0) {
        return [];
      }
      const parsed: unknown = JSON.parse(firstJsonLine(result.stdout));
      if (!Array.isArray(parsed)) {
        throw new Error('Expected JSON array from queryJson');
      }
      return parsed;
    },
  };
}

/**
 * Create a DB client backed by `psql` or `docker compose exec … psql`.
 *
 * Transaction note: each call is a separate psql session when using docker exec.
 * Repository methods are therefore designed as single-statement atomic SQL.
 * `withTransaction` currently runs the callback without a shared session lock;
 * multi-statement atomic scripts should use `runAtomicSqlScript`.
 * Replace with a real driver session when dependency installs are allowed.
 */
export function createPsqlDbClient(options: PsqlClientOptions = {}): DbClient {
  const executor = createExecutor(options);
  return {
    ...executor,
    withTransaction: async (fn) => fn(executor),
  };
}

/** Run multiple statements in one psql invocation (true BEGIN/COMMIT). */
export function runAtomicSqlScript(
  options: PsqlClientOptions,
  statements: readonly string[],
): void {
  const script = `BEGIN;\n${statements.join(';\n')};\nCOMMIT;`;
  assertOk(runPsqlRaw(script, options), script);
}
