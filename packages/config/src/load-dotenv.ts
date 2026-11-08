import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Minimal `.env` loader (no dotenv package). Does not override already-set process.env keys.
 * Searches: explicit path → cwd/.env → monorepo root/.env (via pnpm-workspace.yaml).
 */
export function applyLocalEnvFile(explicitPath?: string): string | null {
  const candidates: string[] = [];
  if (explicitPath !== undefined && explicitPath.trim().length > 0) {
    candidates.push(resolve(explicitPath));
  }
  candidates.push(resolve(process.cwd(), '.env'));

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  if (workspaceRoot !== null) {
    candidates.push(join(workspaceRoot, '.env'));
  }

  // When running from a package via tsx, also try repo root relative to this module.
  const configPkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const monorepoFromConfig = resolve(configPkgRoot, '../..');
  candidates.push(join(monorepoFromConfig, '.env'));

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    if (!existsSync(candidate)) {
      continue;
    }
    mergeEnvFile(candidate);
    return candidate;
  }
  return null;
}

function findWorkspaceRoot(startDir: string): string | null {
  let current = resolve(startDir);
  for (;;) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function mergeEnvFile(path: string): void {
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (key.length === 0 || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
