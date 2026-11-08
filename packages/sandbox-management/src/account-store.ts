import type { SandboxAccount, UUID } from '@moex/domain';

export type SandboxAccountStore = {
  list: () => Promise<SandboxAccount[]>;
  getById: (id: UUID) => Promise<SandboxAccount | null>;
  getByProviderAccountId: (providerAccountId: string) => Promise<SandboxAccount | null>;
  upsert: (account: SandboxAccount) => Promise<SandboxAccount>;
};

export function createMemorySandboxAccountStore(seed: SandboxAccount[] = []): SandboxAccountStore {
  const byId = new Map<string, SandboxAccount>();
  const byProvider = new Map<string, string>();
  for (const account of seed) {
    byId.set(account.id, account);
    byProvider.set(account.providerAccountId, account.id);
  }

  return {
    list: async () => [...byId.values()],
    getById: async (id) => byId.get(id) ?? null,
    getByProviderAccountId: async (providerAccountId) => {
      const id = byProvider.get(providerAccountId);
      if (id === undefined) {
        return null;
      }
      return byId.get(id) ?? null;
    },
    upsert: async (account) => {
      byId.set(account.id, account);
      byProvider.set(account.providerAccountId, account.id);
      return account;
    },
  };
}
