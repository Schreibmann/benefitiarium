import { randomUUID } from 'node:crypto';
import type { SandboxOrderView } from '@moex/contracts';
import {
  type IsoDateTime,
  parseIsoDateTime,
  parseUuid,
  type SandboxAccount,
  type SandboxPosition,
  type UUID,
} from '@moex/domain';

export const CLOSE_PREVIEW_TTL_MS = 15 * 60 * 1000;

export type SandboxClosePreview = {
  previewId: UUID;
  accountId: UUID;
  providerAccountId: string;
  displayName: string | null;
  openOrders: SandboxOrderView[];
  positions: SandboxPosition[];
  warnings: string[];
  confirmationTargets: string[];
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
};

export type ClosePreviewStore = {
  put: (preview: SandboxClosePreview) => Promise<void>;
  get: (previewId: UUID) => Promise<SandboxClosePreview | null>;
};

export function createMemoryClosePreviewStore(): ClosePreviewStore {
  const byId = new Map<string, SandboxClosePreview>();
  return {
    put: async (preview) => {
      byId.set(preview.previewId, preview);
    },
    get: async (previewId) => byId.get(previewId) ?? null,
  };
}

export function buildClosePreview(input: {
  account: SandboxAccount;
  openOrders: SandboxOrderView[];
  positions: SandboxPosition[];
  now: () => Date;
  ttlMs?: number;
}): SandboxClosePreview {
  const created = input.now();
  const ttl = input.ttlMs ?? CLOSE_PREVIEW_TTL_MS;
  const expires = new Date(created.getTime() + ttl);
  const warnings: string[] = [
    'Closing a sandbox account is irreversible for this provider account id.',
    'Local history is retained; the provider will not restore the same account id.',
  ];
  if (input.openOrders.length > 0) {
    warnings.push(
      `Account has ${input.openOrders.length} open order(s); acknowledge before close.`,
    );
  }
  if (input.positions.length > 0) {
    warnings.push(`Account has ${input.positions.length} position(s); acknowledge before close.`);
  }
  const confirmationTargets = [
    input.account.id,
    input.account.providerAccountId,
    ...(input.account.displayName !== null ? [input.account.displayName] : []),
  ];
  return {
    previewId: parseUuid(randomUUID()),
    accountId: input.account.id,
    providerAccountId: input.account.providerAccountId,
    displayName: input.account.displayName,
    openOrders: input.openOrders,
    positions: input.positions,
    warnings,
    confirmationTargets,
    createdAt: parseIsoDateTime(created.toISOString()),
    expiresAt: parseIsoDateTime(expires.toISOString()),
  };
}

export function assertClosePreviewUsable(input: {
  preview: SandboxClosePreview | null;
  accountId: UUID;
  now: () => Date;
}): SandboxClosePreview {
  if (input.preview === null) {
    throw new Error('close preview not found; call previewClose first');
  }
  if (input.preview.accountId !== input.accountId) {
    throw new Error('close preview account mismatch');
  }
  if (input.preview.expiresAt <= parseIsoDateTime(input.now().toISOString())) {
    throw new Error('close preview expired; request a new preview');
  }
  return input.preview;
}

export function closeRequiresOpenRiskAck(preview: SandboxClosePreview): boolean {
  return preview.openOrders.length > 0 || preview.positions.length > 0;
}
