import type { SandboxAccountProvider } from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime } from '@moex/domain';
import { TINVEST_SANDBOX_HOST } from './sandbox-endpoint.js';

type MutableAccount = {
  providerAccountId: string;
  displayName: string | null;
  providerStatus: 'new' | 'open' | 'closed' | 'unknown';
  openedAt: string | null;
  closedAt: string | null;
  balanceRub: string;
};

/**
 * In-memory SandboxAccountProvider for unit/contract tests.
 * Mimics create/fund/close rules without network.
 */
export function createFixtureSandboxAccountProvider(
  seed: MutableAccount[] = [],
): SandboxAccountProvider {
  const accounts = new Map<string, MutableAccount>();
  for (const row of seed) {
    accounts.set(row.providerAccountId, { ...row });
  }
  let seq = seed.length;

  return {
    environment: 'sandbox',
    endpointHost: TINVEST_SANDBOX_HOST,

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
      const providerAccountId = `sandbox-fixture-${seq}`;
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
        throw new Error(`Sandbox account not found: ${providerAccountId}`);
      }
      if (account.providerStatus === 'closed') {
        return;
      }
      account.providerStatus = 'closed';
      account.closedAt = '2026-11-08T19:00:00.000Z';
    },

    payIn: async ({ providerAccountId, amount, currency }) => {
      if (currency !== 'RUB') {
        throw new Error('SandboxPayIn supports RUB only');
      }
      const account = accounts.get(providerAccountId);
      if (!account || account.providerStatus === 'closed') {
        throw new Error(`Sandbox account not fundable: ${providerAccountId}`);
      }
      const next = Number(account.balanceRub) + Number(amount);
      account.balanceRub = String(next);
    },

    getPortfolio: async (providerAccountId) => {
      const account = accounts.get(providerAccountId);
      if (!account) {
        throw new Error(`Sandbox account not found: ${providerAccountId}`);
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
