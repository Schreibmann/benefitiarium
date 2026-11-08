import type { SandboxAccountProvider } from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime, parseUuid, type SandboxAccount } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { createMemorySandboxAccountStore } from './account-store.js';
import { createMemoryOperationJournal } from './operation-journal.js';
import { createSandboxAccountService } from './sandbox-account-service.js';

type MutableAccount = {
  providerAccountId: string;
  displayName: string | null;
  providerStatus: 'new' | 'open' | 'closed' | 'unknown';
  openedAt: string | null;
  closedAt: string | null;
  balanceRub: string;
};

function createTestProvider(seed: MutableAccount[] = []): SandboxAccountProvider {
  const accounts = new Map<string, MutableAccount>();
  for (const row of seed) {
    accounts.set(row.providerAccountId, { ...row });
  }
  let seq = seed.length;
  return {
    environment: 'sandbox',
    endpointHost: 'sandbox-invest-public-api.tbank.ru',
    listAccounts: async () =>
      [...accounts.values()].map((account) => ({
        providerAccountId: account.providerAccountId,
        displayName: account.displayName,
        providerStatus: account.providerStatus,
        openedAt: account.openedAt ? parseIsoDateTime(account.openedAt) : null,
        closedAt: account.closedAt ? parseIsoDateTime(account.closedAt) : null,
      })),
    openAccount: async ({ name }) => {
      seq += 1;
      const providerAccountId = `sandbox-test-${seq}`;
      accounts.set(providerAccountId, {
        providerAccountId,
        displayName: name,
        providerStatus: 'open',
        openedAt: '2026-11-08T18:00:00.000Z',
        closedAt: null,
        balanceRub: '0',
      });
      return { providerAccountId };
    },
    closeAccount: async ({ providerAccountId }) => {
      const account = accounts.get(providerAccountId);
      if (!account) {
        throw new Error('missing');
      }
      account.providerStatus = 'closed';
      account.closedAt = '2026-11-08T19:00:00.000Z';
    },
    payIn: async ({ providerAccountId, amount }) => {
      const account = accounts.get(providerAccountId);
      if (!account) {
        throw new Error('missing');
      }
      account.balanceRub = String(Number(account.balanceRub) + Number(amount));
    },
    getPortfolio: async (providerAccountId) => {
      const account = accounts.get(providerAccountId);
      if (!account) {
        throw new Error('missing');
      }
      return {
        providerAccountId,
        totalAmount: parseDecimalString(account.balanceRub),
        currency: 'RUB',
        expectedYield: parseDecimalString('0'),
        asOf: parseIsoDateTime('2026-11-08T18:30:00.000Z'),
      };
    },
    getPositions: async () => [],
    getOrders: async () => [],
    getOperations: async () => [],
  };
}

describe('SandboxAccountService', () => {
  it('enqueues create without calling provider when writes are disabled', async () => {
    const provider = createTestProvider();
    const service = createSandboxAccountService({
      provider,
      accounts: createMemorySandboxAccountStore(),
      journal: createMemoryOperationJournal(),
      allowProviderWrites: false,
    });

    const result = await service.enqueue({
      type: 'create',
      name: 'bot-a',
      idempotencyKey: 'create-1',
      correlationId: 'corr-1',
    });
    expect(result.operation.status).toBe('queued');
    expect(await provider.listAccounts()).toHaveLength(0);
    await expect(service.executeOperation(result.operation.id)).rejects.toThrow(/disabled/i);
  });

  it('reuses idempotency key without duplicate enqueue', async () => {
    const service = createSandboxAccountService({
      provider: createTestProvider(),
      accounts: createMemorySandboxAccountStore(),
      journal: createMemoryOperationJournal(),
    });
    const first = await service.enqueue({
      type: 'create',
      name: 'bot-a',
      idempotencyKey: 'same-key',
      correlationId: 'c1',
    });
    const second = await service.enqueue({
      type: 'create',
      name: 'bot-a',
      idempotencyKey: 'same-key',
      correlationId: 'c2',
    });
    expect(second.operation.id).toBe(first.operation.id);
    expect(await service.listOperations()).toHaveLength(1);
  });

  it('worker path creates, funds, marks missing, and closes accounts', async () => {
    const provider = createTestProvider();
    const accounts = createMemorySandboxAccountStore();
    const service = createSandboxAccountService({
      provider,
      accounts,
      journal: createMemoryOperationJournal(),
      allowProviderWrites: true,
      now: () => new Date('2026-11-08T20:00:00.000Z'),
    });

    const createOp = await service.enqueue({
      type: 'create',
      name: 'research-bot',
      idempotencyKey: 'op-create',
      correlationId: 'c-create',
    });
    const created = await service.executeOperation(createOp.operation.id);
    expect(created.status).toBe('succeeded');
    const local = await service.listLocalAccounts();
    expect(local).toHaveLength(1);
    const account = local[0];
    if (!account) {
      throw new Error('expected account');
    }

    const fundOp = await service.enqueue({
      type: 'fund',
      accountId: account.id,
      amount: parseDecimalString('250000'),
      currency: 'RUB',
      idempotencyKey: 'op-fund',
      correlationId: 'c-fund',
    });
    expect((await service.executeOperation(fundOp.operation.id)).status).toBe('succeeded');
    expect((await provider.getPortfolio(account.providerAccountId)).totalAmount).toBe('250000');

    const orphan: SandboxAccount = {
      id: parseUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
      providerAccountId: 'gone-provider-id',
      environment: 'sandbox',
      displayName: 'orphan',
      providerStatus: 'open',
      localStatus: 'active',
      openedAt: parseIsoDateTime('2026-10-01T00:00:00.000Z'),
      closedAt: null,
      lastVerifiedAt: null,
    };
    await accounts.upsert(orphan);
    const reconciled = await service.reconcileWithProvider();
    expect(reconciled.find((row) => row.providerAccountId === 'gone-provider-id')?.localStatus).toBe(
      'missing',
    );
    expect(reconciled.find((row) => row.id === account.id)?.localStatus).toBe('active');

    const closeOp = await service.enqueue({
      type: 'close',
      accountId: account.id,
      confirmation: 'research-bot',
      idempotencyKey: 'op-close',
      correlationId: 'c-close',
    });
    expect((await service.executeOperation(closeOp.operation.id)).status).toBe('succeeded');
    expect((await service.getAccount(account.id))?.localStatus).toBe('closed');
  });

  it('rejects fund above limit and refuses non-sandbox host', async () => {
    const provider = createTestProvider();
    const service = createSandboxAccountService({
      provider,
      accounts: createMemorySandboxAccountStore([
        {
          id: parseUuid('11111111-1111-4111-8111-111111111111'),
          providerAccountId: 'acc-1',
          environment: 'sandbox',
          displayName: 'a',
          providerStatus: 'open',
          localStatus: 'active',
          openedAt: parseIsoDateTime('2026-11-01T00:00:00.000Z'),
          closedAt: null,
          lastVerifiedAt: null,
        },
      ]),
      journal: createMemoryOperationJournal(),
    });
    await expect(
      service.enqueue({
        type: 'fund',
        accountId: parseUuid('11111111-1111-4111-8111-111111111111'),
        amount: parseDecimalString('30000001'),
        currency: 'RUB',
        idempotencyKey: 'bad-fund',
        correlationId: 'c',
      }),
    ).rejects.toThrow(/30000000/);

    expect(() =>
      createSandboxAccountService({
        provider: { ...provider, endpointHost: 'invest-public-api.tbank.ru' },
        accounts: createMemorySandboxAccountStore(),
        journal: createMemoryOperationJournal(),
      }),
    ).toThrow(/allowlisted/);
  });

  it('does not mark accounts missing when provider list fails', async () => {
    const base = createTestProvider([
      {
        providerAccountId: 'acc-live',
        displayName: 'live',
        providerStatus: 'open',
        openedAt: '2026-11-01T00:00:00.000Z',
        closedAt: null,
        balanceRub: '0',
      },
    ]);
    const provider: SandboxAccountProvider = {
      ...base,
      listAccounts: async () => {
        throw new Error('429 rate limit');
      },
    };
    const service = createSandboxAccountService({
      provider,
      accounts: createMemorySandboxAccountStore([
        {
          id: parseUuid('22222222-2222-4222-8222-222222222222'),
          providerAccountId: 'acc-live',
          environment: 'sandbox',
          displayName: 'live',
          providerStatus: 'open',
          localStatus: 'active',
          openedAt: parseIsoDateTime('2026-11-01T00:00:00.000Z'),
          closedAt: null,
          lastVerifiedAt: null,
        },
      ]),
      journal: createMemoryOperationJournal(),
      allowProviderWrites: true,
    });
    const listed = await service.reconcileWithProvider();
    expect(listed[0]?.localStatus).toBe('active');
  });
});
