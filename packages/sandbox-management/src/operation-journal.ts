import { randomUUID } from 'node:crypto';
import { parseIsoDateTime, parseUuid, type SandboxAccountOperation, type UUID } from '@moex/domain';

export type OperationJournal = {
  findByIdempotencyKey: (key: string) => Promise<SandboxAccountOperation | null>;
  append: (operation: SandboxAccountOperation) => Promise<SandboxAccountOperation>;
  update: (operation: SandboxAccountOperation) => Promise<SandboxAccountOperation>;
  list: () => Promise<SandboxAccountOperation[]>;
};

export function createMemoryOperationJournal(): OperationJournal {
  const byId = new Map<string, SandboxAccountOperation>();
  const byIdempotency = new Map<string, string>();

  return {
    findByIdempotencyKey: async (key) => {
      const id = byIdempotency.get(key);
      if (id === undefined) {
        return null;
      }
      return byId.get(id) ?? null;
    },
    append: async (operation) => {
      if (byIdempotency.has(operation.idempotencyKey)) {
        throw new Error(`Duplicate idempotency key: ${operation.idempotencyKey}`);
      }
      byId.set(operation.id, operation);
      byIdempotency.set(operation.idempotencyKey, operation.id);
      return operation;
    },
    update: async (operation) => {
      if (!byId.has(operation.id)) {
        throw new Error(`Operation not found: ${operation.id}`);
      }
      byId.set(operation.id, operation);
      return operation;
    },
    list: async () => [...byId.values()],
  };
}

export function createQueuedOperation(input: {
  type: SandboxAccountOperation['type'];
  accountId: UUID | null;
  idempotencyKey: string;
  correlationId: string;
  requestHash?: string | null;
  now?: () => Date;
}): SandboxAccountOperation {
  const now = input.now ?? (() => new Date());
  const createdAt = parseIsoDateTime(now().toISOString());
  return {
    id: parseUuid(randomUUID()),
    accountId: input.accountId,
    type: input.type,
    status: 'queued',
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
    createdAt,
    completedAt: null,
    errorMessage: null,
    requestHash: input.requestHash ?? null,
  };
}
