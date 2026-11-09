import { loadEnv } from '@moex/config';
import type { DbClient, DbExecutor } from '@moex/persistence';
import { describe, expect, it } from 'vitest';
import { composeSandboxAdminDeps } from './compose-sandbox-admin.js';

function createUnreachableDb(): DbClient {
  const executor: DbExecutor = {
    queryJson: async () => {
      throw new Error('unreachable');
    },
    queryJsonValue: async () => {
      throw new Error('unreachable');
    },
    execute: async () => {
      throw new Error('unreachable');
    },
  };
  return {
    ...executor,
    withTransaction: async (fn) => fn(executor),
  };
}

describe('composeSandboxAdminDeps', () => {
  it('uses fixture provider and memory store when forced', async () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://local/moex',
      ADMIN_API_TOKEN: 'admin',
      TINVEST_BASE_URL: 'https://sandbox-invest-public-api.tbank.ru:443',
      TINVEST_SANDBOX_TOKEN: '',
      SANDBOX_ADMIN_STORE: 'memory',
    });
    const deps = await composeSandboxAdminDeps(env, { storeMode: 'memory' });
    expect(deps.storeMode).toBe('memory');
    expect(deps.provider.endpointHost).toBe('sandbox-invest-public-api.tbank.ru');
    expect(deps.provider.environment).toBe('sandbox');
    expect(await deps.sandbox.listLocalAccounts()).toEqual([]);
  });

  it('falls back to memory in auto mode when Postgres is unreachable', async () => {
    const env = loadEnv({
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/moex',
      ADMIN_API_TOKEN: 'admin',
      TINVEST_BASE_URL: 'https://sandbox-invest-public-api.tbank.ru:443',
      TINVEST_SANDBOX_TOKEN: '',
      SANDBOX_ADMIN_STORE: 'auto',
    });
    const deps = await composeSandboxAdminDeps(env, {
      storeMode: 'auto',
      db: createUnreachableDb(),
    });
    expect(deps.storeMode).toBe('memory');
  });
});
