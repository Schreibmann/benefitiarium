import { randomUUID } from 'node:crypto';
import type { AppEnv } from '@moex/config';
import type { SandboxAccountProvider } from '@moex/contracts';
import { parseDecimalString, parseUuid } from '@moex/domain';
import type { AuditLogService, NewOutboxEvent, OutboxRepository } from '@moex/persistence';
import type { SandboxAccountService } from '@moex/sandbox-management';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireAdminAuth } from './auth.js';
import {
  assertNotProductionBaseUrl,
  assertSandboxEndpointHost,
  sanitizeErrorMessage,
} from './sanitize.js';

export type SandboxAdminRouteDeps = {
  env: AppEnv;
  sandbox: SandboxAccountService;
  provider: SandboxAccountProvider;
  audit: AuditLogService;
  outbox: OutboxRepository;
  now?: () => Date;
};

type IdempotentHeaders = {
  idempotencyKey: string;
  correlationId: string;
};

function readIdempotentHeaders(request: FastifyRequest): IdempotentHeaders | { error: string } {
  const idempotencyKeyHeader = request.headers['idempotency-key'];
  const correlationHeader = request.headers['x-correlation-id'];
  const idempotencyKey =
    typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader.trim() : '';
  if (idempotencyKey.length === 0) {
    return { error: 'Idempotency-Key header is required' };
  }
  const correlationId =
    typeof correlationHeader === 'string' && correlationHeader.trim().length > 0
      ? correlationHeader.trim()
      : randomUUID();
  return { idempotencyKey, correlationId };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function enqueueOutbox(outbox: OutboxRepository, event: NewOutboxEvent): Promise<void> {
  try {
    await outbox.enqueue(event);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate/i.test(message)) {
      return;
    }
    throw error;
  }
}

export async function registerSandboxAdminRoutes(
  app: FastifyInstance,
  deps: SandboxAdminRouteDeps,
): Promise<void> {
  assertNotProductionBaseUrl(deps.env.TINVEST_BASE_URL);
  assertSandboxEndpointHost(deps.provider.endpointHost);

  const auth = requireAdminAuth({ adminToken: deps.env.ADMIN_API_TOKEN });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/v1/admin/sandbox')) {
      return;
    }
    await auth(request, reply);
    if (reply.sent) {
      return reply;
    }
  });

  app.get('/api/v1/admin/sandbox/overview', async (_request, reply) => {
    const accounts = await deps.sandbox.listLocalAccounts();
    const operations = await deps.sandbox.listOperations();
    const byStatus: Record<string, number> = {};
    for (const account of accounts) {
      byStatus[account.localStatus] = (byStatus[account.localStatus] ?? 0) + 1;
    }
    const openOps = operations.filter(
      (operation) =>
        operation.status === 'queued' ||
        operation.status === 'running' ||
        operation.status === 'unknown',
    );
    const verifiedAtValues = accounts
      .map((account) => account.lastVerifiedAt)
      .filter((value) => value !== null);
    const lastVerified = verifiedAtValues.sort().at(-1);
    return reply.send({
      endpointHost: deps.provider.endpointHost,
      environment: deps.provider.environment,
      accountCountsByLocalStatus: byStatus,
      accountTotal: accounts.length,
      openOperationCount: openOps.length,
      lastVerifiedAt: lastVerified ?? null,
      fundPolicyNotes: deps.sandbox.fundPolicyNotes(),
    });
  });

  app.get('/api/v1/admin/sandbox/accounts', async (request, reply) => {
    const query = request.query;
    const statusFilter =
      isPlainObject(query) && typeof query.status === 'string' ? query.status : null;
    const accounts = await deps.sandbox.listLocalAccounts();
    const filtered =
      statusFilter === null
        ? accounts
        : accounts.filter((account) => account.localStatus === statusFilter);
    return reply.send({ accounts: filtered });
  });

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/accounts/:id',
    async (request, reply) => {
      const account = await deps.sandbox.getAccount(request.params.id);
      if (account === null) {
        return reply.code(404).send({ error: 'not_found', message: 'Sandbox account not found' });
      }
      const [portfolio, positions, orders] = await Promise.all([
        deps.provider.getPortfolio(account.providerAccountId),
        deps.provider.getPositions(account.providerAccountId),
        deps.provider.getOrders(account.providerAccountId),
      ]);
      return reply.send({ account, portfolio, positions, orders });
    },
  );

  app.get('/api/v1/admin/sandbox/operations', async (_request, reply) => {
    const operations = await deps.sandbox.listOperations();
    return reply.send({
      operations: operations.map((operation) => ({
        ...operation,
        errorMessage:
          operation.errorMessage === null ? null : sanitizeErrorMessage(operation.errorMessage),
      })),
    });
  });

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/accounts/:id/audit',
    async (request, reply) => {
      const entries = await deps.audit.listByTarget('sandbox_account', request.params.id);
      return reply.send({ audit: entries });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/accounts/:id/close/preview',
    async (request, reply) => {
      try {
        const preview = await deps.sandbox.previewClose(request.params.id);
        return reply.send(preview);
      } catch (error: unknown) {
        return reply.code(400).send({
          error: 'preview_failed',
          message: sanitizeErrorMessage(error),
        });
      }
    },
  );

  async function acceptCommand(
    reply: FastifyReply,
    input: {
      correlationId: string;
      actorId: string | null;
      action: string;
      targetId: string | null;
      enqueue: () => ReturnType<SandboxAccountService['enqueue']>;
    },
  ): Promise<void> {
    try {
      const result = await input.enqueue();
      await deps.audit.record({
        actorType: 'api',
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetId === null ? null : 'sandbox_account',
        targetId: input.targetId,
        correlationId: input.correlationId,
        result: 'accepted',
        payload: {
          operationId: result.operation.id,
          operationType: result.operation.type,
          status: result.operation.status,
        },
      });
      await enqueueOutbox(deps.outbox, {
        id: parseUuid(randomUUID()),
        aggregateType: 'sandbox_account_operation',
        aggregateId: result.operation.id,
        eventType: 'sandbox.account.operation.queued',
        payload: {
          operationId: result.operation.id,
          operationType: result.operation.type,
          status: result.operation.status,
          correlationId: input.correlationId,
        },
        createdAt: result.operation.createdAt,
      });
      await reply.code(202).send({
        operationId: result.operation.id,
        status: result.operation.status,
        pollingUrl: `/api/v1/admin/sandbox/operations/${result.operation.id}`,
      });
    } catch (error: unknown) {
      await deps.audit.record({
        actorType: 'api',
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetId === null ? null : 'sandbox_account',
        targetId: input.targetId,
        correlationId: input.correlationId,
        result: 'rejected',
        reason: sanitizeErrorMessage(error),
      });
      await reply.code(400).send({
        error: 'command_rejected',
        message: sanitizeErrorMessage(error),
      });
    }
  }

  app.post('/api/v1/admin/sandbox/accounts', async (request, reply) => {
    const headers = readIdempotentHeaders(request);
    if ('error' in headers) {
      return reply.code(400).send({ error: 'bad_request', message: headers.error });
    }
    const body = request.body;
    const name = isPlainObject(body) && typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length === 0) {
      return reply.code(400).send({ error: 'bad_request', message: 'name is required' });
    }
    await acceptCommand(reply, {
      correlationId: headers.correlationId,
      actorId: 'admin',
      action: 'sandbox.account.create.enqueue',
      targetId: null,
      enqueue: () =>
        deps.sandbox.enqueue({
          type: 'create',
          name,
          idempotencyKey: headers.idempotencyKey,
          correlationId: headers.correlationId,
        }),
    });
  });

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/accounts/:id/sync',
    async (request, reply) => {
      const headers = readIdempotentHeaders(request);
      if ('error' in headers) {
        return reply.code(400).send({ error: 'bad_request', message: headers.error });
      }
      await acceptCommand(reply, {
        correlationId: headers.correlationId,
        actorId: 'admin',
        action: 'sandbox.account.sync.enqueue',
        targetId: request.params.id,
        enqueue: () =>
          deps.sandbox.enqueue({
            type: 'sync',
            accountId: parseUuid(request.params.id),
            idempotencyKey: headers.idempotencyKey,
            correlationId: headers.correlationId,
          }),
      });
    },
  );

  app.post('/api/v1/admin/sandbox/sync', async (request, reply) => {
    const headers = readIdempotentHeaders(request);
    if ('error' in headers) {
      return reply.code(400).send({ error: 'bad_request', message: headers.error });
    }
    await acceptCommand(reply, {
      correlationId: headers.correlationId,
      actorId: 'admin',
      action: 'sandbox.account.sync_all.enqueue',
      targetId: null,
      enqueue: () =>
        deps.sandbox.enqueue({
          type: 'sync',
          accountId: null,
          idempotencyKey: headers.idempotencyKey,
          correlationId: headers.correlationId,
        }),
    });
  });

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/accounts/:id/fund',
    async (request, reply) => {
      const headers = readIdempotentHeaders(request);
      if ('error' in headers) {
        return reply.code(400).send({ error: 'bad_request', message: headers.error });
      }
      const body = request.body;
      if (!isPlainObject(body) || typeof body.amount !== 'string') {
        return reply
          .code(400)
          .send({ error: 'bad_request', message: 'amount decimal string is required' });
      }
      const amount = parseDecimalString(body.amount);
      await acceptCommand(reply, {
        correlationId: headers.correlationId,
        actorId: 'admin',
        action: 'sandbox.account.fund.enqueue',
        targetId: request.params.id,
        enqueue: () =>
          deps.sandbox.enqueue({
            type: 'fund',
            accountId: parseUuid(request.params.id),
            amount,
            currency: 'RUB',
            idempotencyKey: headers.idempotencyKey,
            correlationId: headers.correlationId,
          }),
      });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/accounts/:id/close',
    async (request, reply) => {
      const headers = readIdempotentHeaders(request);
      if ('error' in headers) {
        return reply.code(400).send({ error: 'bad_request', message: headers.error });
      }
      const body = request.body;
      if (
        !isPlainObject(body) ||
        typeof body.previewId !== 'string' ||
        typeof body.confirmation !== 'string' ||
        typeof body.acknowledgeOpenPositionsAndOrders !== 'boolean'
      ) {
        return reply.code(400).send({
          error: 'bad_request',
          message: 'previewId, confirmation, and acknowledgeOpenPositionsAndOrders are required',
        });
      }
      const previewId = parseUuid(body.previewId);
      const confirmation = body.confirmation;
      const acknowledgeOpenPositionsAndOrders = body.acknowledgeOpenPositionsAndOrders;
      await acceptCommand(reply, {
        correlationId: headers.correlationId,
        actorId: 'admin',
        action: 'sandbox.account.close.enqueue',
        targetId: request.params.id,
        enqueue: () =>
          deps.sandbox.enqueue({
            type: 'close',
            accountId: parseUuid(request.params.id),
            previewId,
            confirmation,
            acknowledgeOpenPositionsAndOrders,
            idempotencyKey: headers.idempotencyKey,
            correlationId: headers.correlationId,
          }),
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/sandbox/operations/:id',
    async (request, reply) => {
      const operations = await deps.sandbox.listOperations();
      const operation = operations.find((item) => item.id === request.params.id);
      if (operation === undefined) {
        return reply.code(404).send({ error: 'not_found', message: 'Operation not found' });
      }
      return reply.send({
        operation: {
          ...operation,
          errorMessage:
            operation.errorMessage === null ? null : sanitizeErrorMessage(operation.errorMessage),
        },
      });
    },
  );
}
