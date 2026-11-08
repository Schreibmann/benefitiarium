import { parseIsoDateTime } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { createMemoryAuditLogStore } from './memory.js';
import { REDACTED, redactAuditPayload } from './redact.js';
import { createAuditLogService } from './service.js';

describe('BL-023 audit log', () => {
  it('redacts secret keys and bearer tokens from payloads', () => {
    const redacted = redactAuditPayload({
      accountId: 'acc-1',
      token: 'super-secret-token-value-0123456789',
      nested: {
        apiKey: 'abcd',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
        note: 'safe',
      },
    });
    expect(redacted.token).toBe(REDACTED);
    const nested = redacted.nested;
    expect(nested).toEqual({
      apiKey: REDACTED,
      authorization: REDACTED,
      note: 'safe',
    });
  });

  it('records actor/action/target/correlation/result and keeps append-only history', async () => {
    const store = createMemoryAuditLogStore();
    const audit = createAuditLogService(store);

    await audit.record({
      actorType: 'operator',
      actorId: 'admin-1',
      action: 'sandbox.account.close.enqueue',
      targetType: 'sandbox_account',
      targetId: 'acc-1',
      correlationId: 'corr-close-1',
      result: 'accepted',
      reason: 'operator confirmed close preview',
      payload: {
        previewId: 'prev-1',
        accessToken: 'should-not-persist-plaintext-0123456789abcdef',
      },
      createdAt: parseIsoDateTime('2026-11-09T04:00:00.000Z'),
    });

    const byCorr = await audit.listByCorrelationId('corr-close-1');
    expect(byCorr).toHaveLength(1);
    expect(byCorr[0]?.action).toBe('sandbox.account.close.enqueue');
    expect(byCorr[0]?.payload.accessToken).toBe(REDACTED);

    const byTarget = await audit.listByTarget('sandbox_account', 'acc-1');
    expect(byTarget[0]?.correlationId).toBe('corr-close-1');

    // Repository surface is append-only: no update/delete methods exist.
    expect('update' in store).toBe(false);
    expect('delete' in store).toBe(false);
    expect('remove' in store).toBe(false);
  });

  it('rejects empty action or correlationId', async () => {
    const audit = createAuditLogService(createMemoryAuditLogStore());
    await expect(
      audit.record({
        actorType: 'system',
        action: '  ',
        correlationId: 'c1',
        result: 'failed',
      }),
    ).rejects.toThrow(/action/i);
    await expect(
      audit.record({
        actorType: 'system',
        action: 'noop',
        correlationId: '',
        result: 'failed',
      }),
    ).rejects.toThrow(/correlationId/i);
  });
});
