import { createHash, randomUUID } from 'node:crypto';
import type {
  EnqueueSandboxCommandInput,
  EnqueueSandboxCommandResult,
  SandboxAccountProvider,
} from '@moex/contracts';
import {
  parseIsoDateTime,
  parseUuid,
  type SandboxAccount,
  type SandboxAccountOperation,
} from '@moex/domain';
import type { SandboxAccountStore } from './account-store.js';
import type { SandboxCommandRequest } from './command-request.js';
import { validateSandboxFundAmount } from './funding.js';
import { createQueuedOperation, type OperationJournal } from './operation-journal.js';
import {
  listMissingAccountRecoveries,
  type MissingAccountRecovery,
  reconcileSandboxAccounts,
  type SandboxSyncSummary,
} from './sync.js';

export type SandboxAccountServiceOptions = {
  provider: SandboxAccountProvider;
  accounts: SandboxAccountStore;
  journal: OperationJournal;
  now?: () => Date;
  /**
   * When false (API path), create/fund/close only enqueue durable operations.
   * When true (worker-execution path), write ops may hit the provider.
   */
  allowProviderWrites?: boolean;
};

export type SandboxAccountService = {
  listLocalAccounts: () => Promise<SandboxAccount[]>;
  getAccount: (accountId: string) => Promise<SandboxAccount | null>;
  listMissingRecoveries: () => Promise<MissingAccountRecovery[]>;
  enqueue: (input: EnqueueSandboxCommandInput) => Promise<EnqueueSandboxCommandResult>;
  listOperations: () => Promise<SandboxAccountOperation[]>;
  executeOperation: (operationId: string) => Promise<SandboxAccountOperation>;
  reconcileWithProvider: () => Promise<SandboxSyncSummary>;
};

function requestHash(parts: Record<string, string>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export function createSandboxAccountService(
  options: SandboxAccountServiceOptions,
): SandboxAccountService {
  if (options.provider.environment !== 'sandbox') {
    throw new Error('SandboxAccountService requires a sandbox environment provider');
  }
  if (options.provider.endpointHost !== 'sandbox-invest-public-api.tbank.ru') {
    throw new Error('SandboxAccountService refuses non-allowlisted sandbox endpoint host');
  }

  const now = options.now ?? (() => new Date());
  const allowWrites = options.allowProviderWrites ?? false;

  async function enqueueOrReuse(
    input: EnqueueSandboxCommandInput,
    hash: string,
    accountId: SandboxAccount['id'] | null,
    request: SandboxCommandRequest,
  ): Promise<EnqueueSandboxCommandResult> {
    const existing = await options.journal.findByIdempotencyKey(input.idempotencyKey);
    if (existing !== null) {
      if ((existing.requestHash ?? null) !== hash) {
        throw new Error(
          `Idempotency key reuse with different request hash: ${input.idempotencyKey}`,
        );
      }
      return { operation: existing, accepted: true };
    }
    const operation = await options.journal.append(
      createQueuedOperation({
        type: input.type,
        accountId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        requestHash: hash,
        now,
      }),
      request,
    );
    return { operation, accepted: true };
  }

  async function runReconcile(): Promise<SandboxSyncSummary> {
    return reconcileSandboxAccounts({
      accounts: options.accounts,
      listProviderAccounts: () => options.provider.listAccounts(),
      now,
    });
  }

  return {
    listLocalAccounts: () => options.accounts.list(),

    getAccount: async (accountId) => options.accounts.getById(parseUuid(accountId)),

    listMissingRecoveries: () => listMissingAccountRecoveries(options.accounts),

    enqueue: async (input) => {
      if (input.type === 'create') {
        const name = input.name.trim();
        if (name.length === 0) {
          throw new Error('account name is required');
        }
        return enqueueOrReuse(input, requestHash({ type: 'create', name }), null, {
          type: 'create',
          name,
        });
      }

      if (input.type === 'sync') {
        if (input.accountId === null) {
          return enqueueOrReuse(input, requestHash({ type: 'sync', accountId: '' }), null, {
            type: 'sync',
            accountId: null,
          });
        }
        const account = await options.accounts.getById(input.accountId);
        if (account === null) {
          throw new Error(`Local sandbox account not found: ${input.accountId}`);
        }
        return enqueueOrReuse(
          input,
          requestHash({ type: 'sync', accountId: account.id }),
          account.id,
          { type: 'sync', accountId: account.id },
        );
      }

      const account = await options.accounts.getById(input.accountId);
      if (account === null) {
        throw new Error(`Local sandbox account not found: ${input.accountId}`);
      }

      if (input.type === 'fund') {
        const validated = validateSandboxFundAmount(input.amount);
        if (!validated.ok) {
          throw new Error(validated.reason);
        }
        if (input.currency !== 'RUB') {
          throw new Error('Sandbox funding currency must be RUB');
        }
        return enqueueOrReuse(
          input,
          requestHash({
            type: 'fund',
            accountId: account.id,
            amount: validated.amount,
            currency: 'RUB',
          }),
          account.id,
          { type: 'fund', amount: validated.amount, currency: 'RUB' },
        );
      }

      if (input.confirmation.trim().length === 0) {
        throw new Error('close confirmation is required');
      }
      const expected = account.displayName ?? account.providerAccountId;
      if (input.confirmation.trim() !== expected && input.confirmation.trim() !== account.id) {
        throw new Error('close confirmation does not match account name or id');
      }
      return enqueueOrReuse(
        input,
        requestHash({ type: 'close', accountId: account.id }),
        account.id,
        { type: 'close' },
      );
    },

    listOperations: () => options.journal.list(),

    reconcileWithProvider: () => runReconcile(),

    executeOperation: async (operationId) => {
      if (!allowWrites) {
        throw new Error('Provider writes are disabled in this SandboxAccountService instance');
      }
      const operations = await options.journal.list();
      const operation = operations.find((item) => item.id === operationId);
      if (operation === undefined) {
        throw new Error(`Operation not found: ${operationId}`);
      }
      if (operation.status === 'succeeded' || operation.status === 'failed') {
        return operation;
      }
      if (operation.status === 'unknown') {
        throw new Error('UNKNOWN operation requires reconciliation before retry');
      }

      const payload = await options.journal.getRequest(operation.id);
      if (payload === null) {
        throw new Error(`Missing durable payload for operation ${operation.id}`);
      }

      const running = await options.journal.update({
        ...operation,
        status: 'running',
      });

      try {
        if (payload.type === 'create') {
          const opened = await options.provider.openAccount({ name: payload.name });
          const account: SandboxAccount = {
            id: parseUuid(randomUUID()),
            providerAccountId: opened.providerAccountId,
            environment: 'sandbox',
            displayName: payload.name,
            providerStatus: 'open',
            localStatus: 'active',
            openedAt: parseIsoDateTime(now().toISOString()),
            closedAt: null,
            lastVerifiedAt: parseIsoDateTime(now().toISOString()),
          };
          await options.accounts.upsert(account);
          return markSucceeded(options.journal, { ...running, accountId: account.id }, now);
        }

        if (payload.type === 'sync') {
          await runReconcile();
          return markSucceeded(options.journal, running, now);
        }

        if (running.accountId === null) {
          throw new Error('Operation requires accountId');
        }
        const account = await options.accounts.getById(running.accountId);
        if (account === null) {
          throw new Error(`Account missing for operation ${running.id}`);
        }

        if (payload.type === 'fund') {
          const validated = validateSandboxFundAmount(payload.amount);
          if (!validated.ok) {
            throw new Error(validated.reason);
          }
          await options.provider.payIn({
            providerAccountId: account.providerAccountId,
            amount: validated.amount,
            currency: 'RUB',
          });
          return markSucceeded(options.journal, running, now);
        }

        await options.provider.closeAccount({
          providerAccountId: account.providerAccountId,
        });
        await options.accounts.upsert({
          ...account,
          providerStatus: 'closed',
          localStatus: 'closed',
          closedAt: parseIsoDateTime(now().toISOString()),
          lastVerifiedAt: parseIsoDateTime(now().toISOString()),
        });
        return markSucceeded(options.journal, running, now);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return options.journal.update({
          ...running,
          status: 'failed',
          completedAt: parseIsoDateTime(now().toISOString()),
          errorMessage: message,
        });
      }
    },
  };
}

async function markSucceeded(
  journal: OperationJournal,
  operation: SandboxAccountOperation,
  now: () => Date,
): Promise<SandboxAccountOperation> {
  return journal.update({
    ...operation,
    status: 'succeeded',
    completedAt: parseIsoDateTime(now().toISOString()),
    errorMessage: null,
  });
}
