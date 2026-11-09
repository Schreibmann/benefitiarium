import { GetSandboxAccountsCommand } from '@ttech-pub/invest-sdk-node';
import { describe, expect, it, vi } from 'vitest';
import { TINVEST_ACCOUNT_STATUS } from './sandbox-account-status.js';
import {
  createSdkSandboxAccountProvider,
  type SandboxSdkSender,
} from './sdk-sandbox-account-provider.js';

describe('createSdkSandboxAccountProvider', () => {
  it('lists accounts with ACCOUNT_STATUS_ALL', async () => {
    const send = vi.fn(async (command: unknown) => {
      expect(command).toBeInstanceOf(GetSandboxAccountsCommand);
      if (!(command instanceof GetSandboxAccountsCommand)) {
        throw new Error('expected GetSandboxAccountsCommand');
      }
      expect(command.options.status).toBe(TINVEST_ACCOUNT_STATUS.ALL);
      return {
        accounts: [
          {
            id: 'sbx-1',
            name: 'bot',
            status: TINVEST_ACCOUNT_STATUS.OPEN,
            type: 0,
            openedDate: new Date('2026-11-01T00:00:00.000Z'),
            closedDate: undefined,
            accessLevel: 1,
          },
        ],
      };
    });
    const sdk: SandboxSdkSender = { send };
    const provider = createSdkSandboxAccountProvider({ sdk });
    const rows = await provider.listAccounts();
    expect(rows).toEqual([
      {
        providerAccountId: 'sbx-1',
        displayName: 'bot',
        providerStatus: 'open',
        openedAt: '2026-11-01T00:00:00.000Z',
        closedAt: null,
      },
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
