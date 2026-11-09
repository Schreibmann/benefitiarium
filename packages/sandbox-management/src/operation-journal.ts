import { randomUUID } from 'node:crypto';
import { parseIsoDateTime, parseUuid, type SandboxAccountOperation, type UUID } from '@moex/domain';
import type { SandboxCommandRequest } from './command-request.js';

export type OperationJournal = {
  findByIdempotencyKey: (key: string) => Promise<SandboxAccountOperation | null>;
  append: (
    operation: SandboxAccountOperation,
    request: SandboxCommandRequest,
  ) => Promise<SandboxAccountOperation>;
  update: (operation: SandboxAccountOperation) => Promise<SandboxAccountOperation>;
  list: () => Promise<SandboxAccountOperation[]>;
  getRequest: (operationId: UUID) => Promise<SandboxCommandRequest | null>;
};

export function createMemoryOperationJournal(): OperationJournal {
  const byId = new Map<string, SandboxAccountOperation>();
  const byIdempotency = new Map<string, string>();
  const requests = new Map<string, SandboxCommandRequest>();

  return {
    findByIdempotencyKey: async (key) => {
      const id = byIdempotency.get(key);
      if (id === undefined) {
        return null;
      }
      return byId.get(id) ?? null;
    },
    append: async (operation, request) => {
      if (byIdempotency.has(operation.idempotencyKey)) {
        throw new Error(`Duplicate idempotency key: ${operation.idempotencyKey}`);
      }
      byId.set(operation.id, operation);
      byIdempotency.set(operation.idempotencyKey, operation.id);
      requests.set(operation.id, request);
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
    getRequest: async (operationId) => requests.get(operationId) ?? null,
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
