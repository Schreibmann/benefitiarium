import { randomUUID } from 'node:crypto';
import type { SandboxProviderAccountRow } from '@moex/contracts';
import {
  parseIsoDateTime,
  parseUuid,
  type SandboxAccount,
  type SandboxLocalAccountStatus,
  type SandboxProviderAccountStatus,
} from '@moex/domain';
import type { SandboxAccountStore } from './account-store.js';

export type SandboxSyncSummary = {
  accounts: SandboxAccount[];
  /** Provider rows newly inserted locally. */
  discoveredProviderAccountIds: string[];
  /** Locals marked missing (history kept; not deleted). */
  missingProviderAccountIds: string[];
  /** Locals whose provider/local fields were refreshed. */
  updatedProviderAccountIds: string[];
  /**
   * True when GetSandboxAccounts failed transiently — locals unchanged,
   * nothing marked missing.
   */
  providerUnavailable: boolean;
};

/** Map broker provider status → local diagnostic status (not the inverse). */
export function localStatusFromProvider(
  providerStatus: SandboxProviderAccountStatus,
): SandboxLocalAccountStatus {
  if (providerStatus === 'closed') {
    return 'closed';
  }
  if (providerStatus === 'new') {
    return 'new';
  }
  if (providerStatus === 'open') {
    return 'active';
  }
  return 'unknown';
}

/**
 * Discovery + recovery sync (BL-079).
 * - Upserts by providerAccountId only (never invents a replacement ID for missing).
 * - Marks vanished locals as `missing` without deleting history.
 * - Transient list failure leaves locals untouched.
 */
export async function reconcileSandboxAccounts(input: {
  accounts: SandboxAccountStore;
  listProviderAccounts: () => Promise<SandboxProviderAccountRow[]>;
  now: () => Date;
}): Promise<SandboxSyncSummary> {
  let providerRows: SandboxProviderAccountRow[];
  try {
    providerRows = await input.listProviderAccounts();
  } catch {
    const accounts = await input.accounts.list();
    return {
      accounts,
      discoveredProviderAccountIds: [],
      missingProviderAccountIds: [],
      updatedProviderAccountIds: [],
      providerUnavailable: true,
    };
  }

  const providerIds = new Set(providerRows.map((row) => row.providerAccountId));
  const local = await input.accounts.list();
  const verifiedAt = parseIsoDateTime(input.now().toISOString());
  const discoveredProviderAccountIds: string[] = [];
  const updatedProviderAccountIds: string[] = [];
  const missingProviderAccountIds: string[] = [];

  for (const row of providerRows) {
    const existing = await input.accounts.getByProviderAccountId(row.providerAccountId);
    if (existing !== null) {
      await input.accounts.upsert({
        ...existing,
        displayName: row.displayName ?? existing.displayName,
        providerStatus: row.providerStatus,
        localStatus: localStatusFromProvider(row.providerStatus),
        openedAt: row.openedAt ?? existing.openedAt,
        closedAt: row.closedAt,
        lastVerifiedAt: verifiedAt,
      });
      updatedProviderAccountIds.push(row.providerAccountId);
      continue;
    }
    await input.accounts.upsert({
      id: parseUuid(randomUUID()),
      providerAccountId: row.providerAccountId,
      environment: 'sandbox',
      displayName: row.displayName,
      providerStatus: row.providerStatus,
      localStatus: localStatusFromProvider(row.providerStatus),
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      lastVerifiedAt: verifiedAt,
    });
    discoveredProviderAccountIds.push(row.providerAccountId);
  }

  for (const account of local) {
    if (!providerIds.has(account.providerAccountId) && account.localStatus !== 'closed') {
      await input.accounts.upsert({
        ...account,
        localStatus: 'missing',
        lastVerifiedAt: verifiedAt,
      });
      missingProviderAccountIds.push(account.providerAccountId);
    }
  }

  return {
    accounts: await input.accounts.list(),
    discoveredProviderAccountIds,
    missingProviderAccountIds,
    updatedProviderAccountIds,
    providerUnavailable: false,
  };
}

/** Recovery hint for Admin UI: missing accounts are not restorable under the same provider ID. */
export type MissingAccountRecovery = {
  account: SandboxAccount;
  action: 'create_new_account';
  reason: 'provider_account_absent';
};

export async function listMissingAccountRecoveries(
  accounts: SandboxAccountStore,
): Promise<MissingAccountRecovery[]> {
  const rows = await accounts.list();
  return rows
    .filter((account) => account.localStatus === 'missing')
    .map((account) => ({
      account,
      action: 'create_new_account' as const,
      reason: 'provider_account_absent' as const,
    }));
}
