import {
  type Instrument,
  type InstrumentSpec,
  parseDecimalString,
  parseInstrumentId,
  parseIsoDateTime,
  parseUuid,
  type SandboxAccount,
  type SandboxAccountOperation,
} from '@moex/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REDACTED } from '../audit/redact.js';
import { createAuditLogRepository } from '../audit/repository.js';
import type { DbClient } from '../db/client.js';
import { createPsqlDbClient } from '../db/psql-client.js';
import { createOutboxRepository } from '../outbox/repository.js';
import { createBrokerAccountRepository } from './broker-accounts.js';
import { createInstrumentSpecRepository } from './instrument-specs.js';
import { createInstrumentRepository } from './instruments.js';
import { createSandboxOperationRepository } from './sandbox-operations.js';

const INSTRUMENT_ID = parseInstrumentId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
const ACCOUNT_ID = parseUuid('11111111-2222-4333-8444-555555555555');
const OPERATION_ID = parseUuid('99999999-8888-4777-8666-555555555555');

async function canReachPostgres(db: DbClient): Promise<boolean> {
  try {
    await db.queryJsonValue(`SELECT to_json(1)`);
    return true;
  } catch {
    return false;
  }
}

describe('BL-021 repositories (Postgres)', () => {
  let db: DbClient;
  let available = false;

  beforeAll(async () => {
    db = createPsqlDbClient();
    available = await canReachPostgres(db);
  });

  beforeEach(async () => {
    if (!available) {
      return;
    }
    await db.execute(`
      TRUNCATE audit_log, outbox_events, sandbox_account_operations, broker_accounts,
        instrument_specs, instrument_provider_ids, instruments
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    if (db.close !== undefined) {
      await db.close();
    }
  });

  it('upserts instruments, provider links, and half-open specs', async () => {
    if (!available) {
      return;
    }
    const instruments = createInstrumentRepository(db);
    const specs = createInstrumentSpecRepository(db);

    const instrument: Instrument = {
      id: INSTRUMENT_ID,
      assetType: 'future',
      ticker: 'BRZ5',
      name: 'Brent',
      exchange: 'MOEX',
      currency: 'USD',
      isActive: true,
    };
    await instruments.upsert(instrument);
    expect((await instruments.getById(INSTRUMENT_ID))?.ticker).toBe('BRZ5');

    await instruments.linkProviderId({
      instrumentId: INSTRUMENT_ID,
      provider: 't-invest',
      providerInstrumentId: 'uid-brz5',
      engine: 'futures',
      market: 'forts',
      board: 'RFUD',
      secid: 'BRZ5',
      classCode: 'SPBFUT',
      isPrimary: true,
      raw: { source: 'test' },
    });
    expect((await instruments.findByProviderInstrumentId('t-invest', 'uid-brz5'))?.id).toBe(
      INSTRUMENT_ID,
    );

    const v1: InstrumentSpec = {
      instrumentId: INSTRUMENT_ID,
      validFrom: parseIsoDateTime('2024-01-01T00:00:00.000Z'),
      validTo: null,
      lotSize: 1,
      minPriceIncrement: parseDecimalString('0.01'),
      priceCurrency: 'USD',
      priceType: 'currency',
      contractMultiplier: parseDecimalString('10'),
      expirationAt: parseIsoDateTime('2025-11-01T00:00:00.000Z'),
      marginInitial: null,
      underlyingProviderPositionUid: null,
      underlyingAssetType: 'commodity',
      underlyingAssetName: 'Brent',
      contractFamily: 'BR',
      priceUnit: 'USD/bbl',
      minPriceIncrementAmount: null,
      raw: {},
    };
    await specs.appendVersion(v1);

    const v2: InstrumentSpec = {
      ...v1,
      validFrom: parseIsoDateTime('2024-06-01T00:00:00.000Z'),
      lotSize: 2,
      minPriceIncrement: parseDecimalString('0.02'),
    };
    await specs.appendVersion(v2);

    const activeEarly = await specs.getActiveAt(
      INSTRUMENT_ID,
      parseIsoDateTime('2024-03-01T00:00:00.000Z'),
    );
    expect(activeEarly?.lotSize).toBe(1);
    expect(String(activeEarly?.validTo)).toMatch(/^2024-06-01T00:00:00/);

    const activeLate = await specs.getActiveAt(
      INSTRUMENT_ID,
      parseIsoDateTime('2024-07-01T00:00:00.000Z'),
    );
    expect(activeLate?.lotSize).toBe(2);
    expect(activeLate?.validTo).toBeNull();
  });

  it('persists sandbox accounts and operation journal', async () => {
    if (!available) {
      return;
    }
    const accounts = createBrokerAccountRepository(db);
    const operations = createSandboxOperationRepository(db);

    const account: SandboxAccount = {
      id: ACCOUNT_ID,
      providerAccountId: 'sandbox-acc-1',
      environment: 'sandbox',
      displayName: 'Test',
      providerStatus: 'open',
      localStatus: 'active',
      openedAt: parseIsoDateTime('2024-01-01T00:00:00.000Z'),
      closedAt: null,
      lastVerifiedAt: parseIsoDateTime('2024-01-02T00:00:00.000Z'),
    };
    await accounts.upsertSandbox(account);
    expect((await accounts.getByProviderAccountId('sandbox-acc-1'))?.id).toBe(ACCOUNT_ID);

    const operation: SandboxAccountOperation = {
      id: OPERATION_ID,
      accountId: ACCOUNT_ID,
      type: 'fund',
      status: 'queued',
      idempotencyKey: 'idem-1',
      correlationId: 'corr-1',
      createdAt: parseIsoDateTime('2024-01-03T00:00:00.000Z'),
      completedAt: null,
      errorMessage: null,
      requestHash: 'abc',
    };
    await operations.append(operation, {
      type: 'fund',
      amount: '1000',
      currency: 'RUB',
    });
    expect((await operations.findByIdempotencyKey('idem-1'))?.status).toBe('queued');
    expect(await operations.getRequest(OPERATION_ID)).toEqual({
      type: 'fund',
      amount: '1000',
      currency: 'RUB',
    });

    await expect(
      operations.append(operation, { type: 'fund', amount: '1000', currency: 'RUB' }),
    ).rejects.toThrow(/Duplicate idempotency key/);

    const updated = await operations.update({
      ...operation,
      status: 'succeeded',
      completedAt: parseIsoDateTime('2024-01-03T01:00:00.000Z'),
    });
    expect(updated.status).toBe('succeeded');
    expect((await operations.list()).length).toBe(1);
  });

  it('enqueues and publishes outbox events by eventId', async () => {
    if (!available) {
      return;
    }
    const outbox = createOutboxRepository(db);
    const eventId = parseUuid('33333333-3333-4333-8333-333333333333');
    await outbox.enqueue({
      id: eventId,
      aggregateType: 'sandbox_account_operation',
      aggregateId: OPERATION_ID,
      eventType: 'sandbox.operation.queued',
      payload: { operationId: OPERATION_ID },
      createdAt: parseIsoDateTime('2026-11-09T03:00:00.000Z'),
    });
    expect((await outbox.listPending())[0]?.id).toBe(eventId);
    const published = await outbox.markPublished(
      eventId,
      parseIsoDateTime('2026-11-09T03:05:00.000Z'),
    );
    expect(published.publishedAt).toBe('2026-11-09T03:05:00.000Z');
    expect(await outbox.listPending()).toHaveLength(0);
    await expect(
      outbox.enqueue({
        id: eventId,
        aggregateType: 'sandbox_account_operation',
        aggregateId: OPERATION_ID,
        eventType: 'sandbox.operation.queued',
        payload: { operationId: OPERATION_ID },
      }),
    ).rejects.toThrow();
  });

  it('appends audit rows with redacted secrets', async () => {
    if (!available) {
      return;
    }
    const audit = createAuditLogRepository(db);
    const written = await audit.append({
      actorType: 'api',
      actorId: 'admin',
      action: 'sandbox.account.fund.enqueue',
      targetType: 'sandbox_account',
      targetId: ACCOUNT_ID,
      correlationId: 'corr-audit-1',
      result: 'accepted',
      payload: { token: 'plaintext-secret-should-be-redacted-0001' },
      createdAt: parseIsoDateTime('2026-11-09T05:00:00.000Z'),
    });
    expect(written.payload.token).toBe(REDACTED);
    expect((await audit.listByCorrelationId('corr-audit-1'))[0]?.action).toBe(
      'sandbox.account.fund.enqueue',
    );
  });
});
