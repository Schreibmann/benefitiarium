import { parseIsoDateTime, parseUuid } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import {
  assertClosePreviewUsable,
  buildClosePreview,
  closeRequiresOpenRiskAck,
} from './close-preview.js';

describe('close preview', () => {
  it('builds confirmation targets and requires ack when orders exist', () => {
    const preview = buildClosePreview({
      account: {
        id: parseUuid('11111111-1111-4111-8111-111111111111'),
        providerAccountId: 'prov-1',
        environment: 'sandbox',
        displayName: 'bot',
        providerStatus: 'open',
        localStatus: 'active',
        openedAt: parseIsoDateTime('2026-11-01T00:00:00.000Z'),
        closedAt: null,
        lastVerifiedAt: null,
      },
      openOrders: [
        {
          providerAccountId: 'prov-1',
          brokerOrderId: 'o1',
          providerInstrumentId: 'x',
          direction: 'BUY',
          orderType: 'LIMIT',
          lotsRequested: 1,
          lotsExecuted: 0,
          status: 'NEW',
          orderDate: null,
        },
      ],
      positions: [],
      now: () => new Date('2026-11-08T12:00:00.000Z'),
    });
    expect(preview.confirmationTargets).toEqual([
      '11111111-1111-4111-8111-111111111111',
      'prov-1',
      'bot',
    ]);
    expect(closeRequiresOpenRiskAck(preview)).toBe(true);
    expect(() =>
      assertClosePreviewUsable({
        preview,
        accountId: preview.accountId,
        now: () => new Date('2026-11-08T12:10:00.000Z'),
      }),
    ).not.toThrow();
    expect(() =>
      assertClosePreviewUsable({
        preview,
        accountId: preview.accountId,
        now: () => new Date('2026-11-08T12:16:00.000Z'),
      }),
    ).toThrow(/expired/i);
  });
});
