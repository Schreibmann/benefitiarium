#!/usr/bin/env node
/**
 * Apply SQL migrations without an npm DB driver.
 * Prefers: psql $DATABASE_URL
 * Fallback: docker compose exec -T postgres psql -U postgres -d moex
 *
 * Usage: node ./scripts/migrate.mjs [status|migrate]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const action = process.argv[2] ?? 'migrate';
const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '../migrations');
const repoRoot = resolve(here, '../../..');

function listMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));
}

function runPsql(sql, { file } = {}) {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
  if (databaseUrl.length > 0) {
    const args = file
      ? [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', file]
      : [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql];
    const result = spawnSync('psql', args, { encoding: 'utf8' });
    if (result.status === 0) {
      return result;
    }
    if (result.error?.code !== 'ENOENT') {
      return result;
    }
  }

  const composeFile = join(repoRoot, 'docker-compose.yml');
  if (!existsSync(composeFile)) {
    return {
      status: 1,
      stdout: '',
      stderr: 'DATABASE_URL/psql unavailable and docker-compose.yml missing',
    };
  }

  const dockerArgs = [
    'compose',
    '-f',
    composeFile,
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'postgres',
    '-d',
    'moex',
    '-v',
    'ON_ERROR_STOP=1',
  ];
  if (file) {
    // Pipe file contents via stdin — container may not see host paths.
    const content = readFileSync(file, 'utf8');
    return spawnSync('docker', [...dockerArgs], {
      encoding: 'utf8',
      input: content,
    });
  }
  return spawnSync('docker', [...dockerArgs, '-c', sql], { encoding: 'utf8' });
}

function assertOk(result, label) {
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim();
    console.error(`migrate failed (${label}): ${detail || `exit ${result.status}`}`);
    process.exit(1);
  }
}

function appliedIds() {
  const result = runPsql('SELECT id FROM schema_migrations ORDER BY id;');
  if (result.status !== 0) {
    // Table may not exist yet.
    return new Set();
  }
  const ids = new Set();
  for (const line of (result.stdout ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (
      trimmed.length === 0 ||
      trimmed === 'id' ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('(')
    ) {
      continue;
    }
    ids.add(trimmed);
  }
  return ids;
}

function status() {
  const files = listMigrationFiles();
  const applied = appliedIds();
  console.log('Migration status:');
  for (const file of files) {
    const id = file.replace(/\.sql$/, '');
    const mark = applied.has(id) ? 'applied' : 'pending';
    console.log(`  ${id}: ${mark}`);
  }
}

function migrate() {
  const files = listMigrationFiles();
  // Ensure ledger first if present.
  const ledger = files.find((name) => name.startsWith('000_'));
  if (ledger) {
    const ledgerPath = join(migrationsDir, ledger);
    const ensure = runPsql(undefined, { file: ledgerPath });
    assertOk(ensure, ledger);
    const mark = runPsql(
      `INSERT INTO schema_migrations (id) VALUES ('${ledger.replace(/\.sql$/, '')}') ON CONFLICT DO NOTHING;`,
    );
    assertOk(mark, `mark ${ledger}`);
  }

  const applied = appliedIds();
  for (const file of files) {
    const id = file.replace(/\.sql$/, '');
    if (applied.has(id)) {
      console.log(`skip ${id}`);
      continue;
    }
    const path = join(migrationsDir, file);
    console.log(`apply ${id}`);
    const result = runPsql(undefined, { file: path });
    assertOk(result, id);
    const mark = runPsql(
      `INSERT INTO schema_migrations (id) VALUES ('${id}') ON CONFLICT DO NOTHING;`,
    );
    assertOk(mark, `mark ${id}`);
  }
  console.log('migrate complete');
}

if (action === 'status') {
  status();
} else if (action === 'migrate' || action === 'generate') {
  if (action === 'generate') {
    console.log(
      'db:generate is a no-op until Drizzle is introduced; SQL files live in migrations/.',
    );
  }
  migrate();
} else {
  console.error(`Unknown action: ${action}`);
  process.exit(1);
}
