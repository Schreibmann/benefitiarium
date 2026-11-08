import type { BrokerAccountRepository, SandboxOperationRepository } from '@moex/persistence';
import type { SandboxAccountStore } from './account-store.js';
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
    append: (operation) => operations.append(operation),
    update: (operation) => operations.update(operation),
    list: () => operations.list(),
  };
}
