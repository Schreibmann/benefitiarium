import type { SandboxAccountProvider } from '@moex/contracts';
import { parseDecimalString, parseIsoDateTime } from '@moex/domain';
import {
  CloseSandboxAccountCommand,
  GetSandboxAccountsCommand,
  GetSandboxPortfolioCommand,
  GetSandboxPositionsCommand,
  type InvestNodeSDK,
  OpenSandboxAccountCommand,
  SandboxPayInCommand,
} from '@ttech-pub/invest-sdk-node';
import { mapTinvestAccountStatus, TINVEST_ACCOUNT_STATUS } from './sandbox-account-status.js';
import { TINVEST_SANDBOX_HOST } from './sandbox-endpoint.js';

/** Narrow SDK surface used by the sandbox account provider. */
export type SandboxSdkSender = {
  send: InvestNodeSDK['send'];
};

function moneyToDecimalString(value: { units: number; nano: number } | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const sign = value.units < 0 || value.nano < 0 ? '-' : '';
  const units = Math.abs(value.units);
  const nano = Math.abs(value.nano);
  if (nano === 0) {
    return `${sign}${units}`;
  }
  const frac = String(nano).padStart(9, '0').replace(/0+$/, '');
  return `${sign}${units}.${frac}`;
}

function dateToIso(value: Date | undefined): ReturnType<typeof parseIsoDateTime> | null {
  if (value === undefined) {
    return null;
  }
  return parseIsoDateTime(value.toISOString());
}

function splitDecimalAmount(amount: string): { units: number; nano: number } {
  const negative = amount.startsWith('-');
  const normalized = negative ? amount.slice(1) : amount;
  const [unitsPart, fracPart] = normalized.split('.');
  const units = Number(unitsPart ?? '0');
  const nano = fracPart === undefined ? 0 : Number(fracPart.padEnd(9, '0').slice(0, 9));
  if (negative) {
    return { units: -units, nano: -nano };
  }
  return { units, nano };
}

/**
 * Live SandboxAccountProvider bound to sandbox SDK.
 * GetSandboxAccounts always requests ACCOUNT_STATUS_ALL (BL-079).
 */
export function createSdkSandboxAccountProvider(input: {
  sdk: SandboxSdkSender;
}): SandboxAccountProvider {
  return {
    environment: 'sandbox',
    endpointHost: TINVEST_SANDBOX_HOST,

    listAccounts: async () => {
      const response = await input.sdk.send(
        new GetSandboxAccountsCommand({
          status: TINVEST_ACCOUNT_STATUS.ALL,
        }),
      );
      const accounts = Array.isArray(response.accounts) ? response.accounts : [];
      return accounts.map((account) => ({
        providerAccountId: account.id,
        displayName: account.name.length > 0 ? account.name : null,
        providerStatus: mapTinvestAccountStatus(account.status),
        openedAt: dateToIso(account.openedDate),
        closedAt: dateToIso(account.closedDate),
      }));
    },

    openAccount: async ({ name }) => {
      const response = await input.sdk.send(new OpenSandboxAccountCommand({ name }));
      return { providerAccountId: response.accountId };
    },

    closeAccount: async ({ providerAccountId }) => {
      await input.sdk.send(new CloseSandboxAccountCommand({ accountId: providerAccountId }));
    },

    payIn: async ({ providerAccountId, amount, currency }) => {
      if (currency !== 'RUB') {
        throw new Error('SandboxPayIn supports RUB only');
      }
      const parts = splitDecimalAmount(amount);
      await input.sdk.send(
        new SandboxPayInCommand({
          accountId: providerAccountId,
          amount: {
            currency: 'rub',
            units: parts.units,
            nano: parts.nano,
          },
        }),
      );
    },

    getPortfolio: async (providerAccountId) => {
      const response = await input.sdk.send(
        new GetSandboxPortfolioCommand({ accountId: providerAccountId }),
      );
      const total = moneyToDecimalString(response.totalAmountPortfolio);
      const yieldRaw = moneyToDecimalString(
        response.expectedYield === undefined
          ? undefined
          : { units: response.expectedYield.units, nano: response.expectedYield.nano },
      );
      return {
        providerAccountId,
        totalAmount: total === null ? null : parseDecimalString(total),
        currency: 'RUB',
        expectedYield: yieldRaw === null ? null : parseDecimalString(yieldRaw),
        asOf: parseIsoDateTime(new Date().toISOString()),
      };
    },

    getPositions: async (providerAccountId) => {
      const response = await input.sdk.send(
        new GetSandboxPositionsCommand({ accountId: providerAccountId }),
      );
      const securities = Array.isArray(response.securities) ? response.securities : [];
      return securities.map((row) => ({
        providerAccountId,
        providerInstrumentId: row.instrumentUid,
        quantity: parseDecimalString(String(row.balance)),
        averagePrice: null,
        currentPrice: null,
        currency: null,
      }));
    },

    getOrders: async () => [],
    getOperations: async () => [],
  };
}
