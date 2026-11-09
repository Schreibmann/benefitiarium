import { loadEnv } from '@moex/config';
import { describe, expect, it } from 'vitest';
import { composeSandboxAdminDeps } from './compose-sandbox-admin.js';

describe('composeSandboxAdminDeps', () => {
  it('uses fixture provider when sandbox token is absent', async () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://local/moex',
      ADMIN_API_TOKEN: 'admin',
      TINVEST_BASE_URL: 'https://sandbox-invest-public-api.tbank.ru:443',
      TINVEST_SANDBOX_TOKEN: '',
    });
    const deps = await composeSandboxAdminDeps(env);
    expect(deps.provider.endpointHost).toBe('sandbox-invest-public-api.tbank.ru');
    expect(deps.provider.environment).toBe('sandbox');
    expect(await deps.sandbox.listLocalAccounts()).toEqual([]);
  });
});
