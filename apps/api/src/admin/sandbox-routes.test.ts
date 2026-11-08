import { loadEnv } from '@moex/config';
import type { SandboxAccountProvider } from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime, parseUuid } from '@moex/domain';
import {
  createAuditLogService,
  createMemoryAuditLogStore,
  createMemoryOutboxStore,
} from '@moex/persistence';
import {
  createMemoryOperationJournal,
  createMemorySandboxAccountStore,
  createSandboxAccountService,
} from '@moex/sandbox-management';
import { describe, expect, it } from 'vitest';
import { createApp } from '../create-app.js';

function createTestProvider(): SandboxAccountProvider {
  return {
    environment: 'sandbox',
    endpointHost: 'sandbox-invest-public-api.tbank.ru',
    listAccounts: async () => [],
    openAccount: async () => ({ providerAccountId: 'should-not-run' }),
    closeAccount: async () => {
      throw new Error('write disabled');
    },
    payIn: async () => {
      throw new Error('write disabled');
    },
    getPortfolio: async (providerAccountId) => ({
      providerAccountId,
      totalAmount: parseDecimalString('0'),
      currency: 'RUB',
      expectedYield: parseDecimalString('0'),
      asOf: parseIsoDateTime('2026-11-09T00:00:00.000Z'),
    }),
    getPositions: async () => [],
    getOrders: async () => [],
    getOperations: async () => [],
  };
}

describe('BL-088 Sandbox Admin API', () => {
  it('rejects anonymous admin access and does not leak tokens', async () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://local/moex',
      ADMIN_API_TOKEN: 'admin-secret-token',
      TINVEST_BASE_URL: 'https://sandbox-invest-public-api.tbank.ru:443',
      TINVEST_SANDBOX_TOKEN: 'sandbox-token-must-never-appear',
    });
    const provider = createTestProvider();
    const sandbox = createSandboxAccountService({
      provider,
      accounts: createMemorySandboxAccountStore([
        {
          id: parseUuid('11111111-1111-4111-8111-111111111111'),
          providerAccountId: 'prov-1',
          environment: 'sandbox',
          displayName: 'bot',
          providerStatus: 'open',
          localStatus: 'active',
          openedAt: parseIsoDateTime('2026-11-01T00:00:00.000Z'),
          closedAt: null,
          lastVerifiedAt: null,
        },
      ]),
      journal: createMemoryOperationJournal(),
      allowProviderWrites: false,
    });
    const app = await createApp({
      env,
      sandboxAdmin: {
        sandbox,
        provider,
        audit: createAuditLogService(createMemoryAuditLogStore()),
        outbox: createMemoryOutboxStore(),
      },
    });

    const anonymous = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sandbox/overview',
    });
    expect(anonymous.statusCode).toBe(401);

    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sandbox/overview',
      headers: { authorization: 'Bearer wrong' },
    });
    expect(forbidden.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sandbox/overview',
      headers: { authorization: 'Bearer admin-secret-token' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).not.toMatch(/sandbox-token-must-never-appear/);
    expect(ok.body).not.toMatch(/admin-secret-token/);
    expect(JSON.parse(ok.body).endpointHost).toBe('sandbox-invest-public-api.tbank.ru');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sandbox/accounts',
      headers: {
        authorization: 'Bearer admin-secret-token',
        'idempotency-key': 'create-1',
        'content-type': 'application/json',
      },
      payload: { name: 'api-bot' },
    });
    expect(created.statusCode).toBe(202);
    const body = JSON.parse(created.body);
    expect(body.status).toBe('queued');
    expect(body.pollingUrl).toContain('/api/v1/admin/sandbox/operations/');
    expect(created.body).not.toMatch(/sandbox-token-must-never-appear/);

    await app.close();
  });

  it('refuses to boot sandbox admin against production base URL', async () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://local/moex',
      ADMIN_API_TOKEN: 'admin-secret-token',
      TINVEST_BASE_URL: 'https://invest-public-api.tbank.ru:443',
    });
    const provider = createTestProvider();
    await expect(
      createApp({
        env,
        sandboxAdmin: {
          sandbox: createSandboxAccountService({
            provider,
            accounts: createMemorySandboxAccountStore(),
            journal: createMemoryOperationJournal(),
          }),
          provider,
          audit: createAuditLogService(createMemoryAuditLogStore()),
          outbox: createMemoryOutboxStore(),
        },
      }),
    ).rejects.toThrow(/production/i);
  });
});
