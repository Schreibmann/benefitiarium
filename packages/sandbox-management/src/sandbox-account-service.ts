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
import { createHash, randomUUID } from 'node:crypto';
import type { SandboxAccountStore } from './account-store.js';
import { validateSandboxFundAmount } from './funding.js';
import { createQueuedOperation, type OperationJournal } from './operation-journal.js';

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

/** In-memory payload until durable request bodies are persisted beside the journal. */
type PendingPayload =
  | { type: 'create'; name: string }
  | { type: 'fund'; amount: string }
  | { type: 'close' }
  | { type: 'sync'; accountId: string | null };

export type SandboxAccountService = {
  listLocalAccounts: () => Promise<SandboxAccount[]>;
  getAccount: (accountId: string) => Promise<SandboxAccount | null>;
  enqueue: (input: EnqueueSandboxCommandInput) => Promise<EnqueueSandboxCommandResult>;
  listOperations: () => Promise<SandboxAccountOperation[]>;
  executeOperation: (operationId: string) => Promise<SandboxAccountOperation>;
  reconcileWithProvider: () => Promise<SandboxAccount[]>;
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
  const payloads = new Map<string, PendingPayload>();

  async function enqueueOrReuse(
    input: EnqueueSandboxCommandInput,
    hash: string,
    accountId: SandboxAccount['id'] | null,
    payload: PendingPayload,
  ): Promise<EnqueueSandboxCommandResult> {
    const existing = await options.journal.findByIdempotencyKey(input.idempotencyKey);
    if (existing !== null) {
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
    );
    payloads.set(operation.id, payload);
    return { operation, accepted: true };
  }

  return {
    listLocalAccounts: () => options.accounts.list(),

    getAccount: async (accountId) => options.accounts.getById(parseUuid(accountId)),

    enqueue: async (input) => {
      if (input.type === 'create') {
        const name = input.name.trim();
        if (name.length === 0) {
          throw new Error('account name is required');
        }
        return enqueueOrReuse(
          input,
          requestHash({ type: 'create', name }),
          null,
          { type: 'create', name },
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
          { type: 'fund', amount: validated.amount },
        );
      }

      if (input.type === 'close') {
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
      }

      return enqueueOrReuse(
        input,
        requestHash({ type: 'sync', accountId: account.id }),
        account.id,
        { type: 'sync', accountId: account.id },
      );
    },

    listOperations: () => options.journal.list(),

    reconcileWithProvider: () => reconcileAccounts(options, now),

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

      const payload = payloads.get(operation.id);
      if (payload === undefined) {
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
          await reconcileAccounts(options, now);
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

async function reconcileAccounts(
  options: SandboxAccountServiceOptions,
  now: () => Date,
): Promise<SandboxAccount[]> {
  let providerRows;
  try {
    providerRows = await options.provider.listAccounts();
  } catch {
    // Transient provider errors must not mark all locals missing.
    return options.accounts.list();
  }

  const providerIds = new Set(providerRows.map((row) => row.providerAccountId));
  const local = await options.accounts.list();
  const verifiedAt = parseIsoDateTime(now().toISOString());

  for (const row of providerRows) {
    const existing = await options.accounts.getByProviderAccountId(row.providerAccountId);
    if (existing !== null) {
      await options.accounts.upsert({
        ...existing,
        displayName: row.displayName ?? existing.displayName,
        providerStatus: row.providerStatus,
        localStatus: row.providerStatus === 'closed' ? 'closed' : 'active',
        openedAt: row.openedAt ?? existing.openedAt,
        closedAt: row.closedAt,
        lastVerifiedAt: verifiedAt,
      });
      continue;
    }
    await options.accounts.upsert({
      id: parseUuid(randomUUID()),
      providerAccountId: row.providerAccountId,
      environment: 'sandbox',
      displayName: row.displayName,
      providerStatus: row.providerStatus,
      localStatus: row.providerStatus === 'closed' ? 'closed' : 'active',
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      lastVerifiedAt: verifiedAt,
    });
  }

  for (const account of local) {
    if (!providerIds.has(account.providerAccountId) && account.localStatus !== 'closed') {
      await options.accounts.upsert({
        ...account,
        localStatus: 'missing',
        lastVerifiedAt: verifiedAt,
      });
    }
  }

  return options.accounts.list();
}
