import type { BrokerAccountRepository, SandboxOperationRepository } from '@moex/persistence';
import type { SandboxAccountStore } from './account-store.js';
import { parseSandboxCommandRequest } from './command-request.js';
import type { OperationJournal } from './operation-journal.js';

/** Adapt BrokerAccountRepository to the SandboxAccountStore port. */
export function createPostgresSandboxAccountStore(
  accounts: BrokerAccountRepository,
): SandboxAccountStore {
  return {
    list: () => accounts.listSandbox(),
    getById: (id) => accounts.getById(id),
    getByProviderAccountId: (providerAccountId) =>
      accounts.getByProviderAccountId(providerAccountId),
    upsert: (account) => accounts.upsertSandbox(account),
  };
}

/** Adapt SandboxOperationRepository to the OperationJournal port. */
export function createPostgresOperationJournal(
  operations: SandboxOperationRepository,
): OperationJournal {
  return {
    findByIdempotencyKey: (key) => operations.findByIdempotencyKey(key),
    append: (operation, request) => operations.append(operation, request),
    update: (operation) => operations.update(operation),
    list: () => operations.list(),
    getRequest: async (operationId) => {
      const raw = await operations.getRequest(operationId);
      if (raw === null) {
        return null;
      }
      return parseSandboxCommandRequest(raw);
    },
  };
}
