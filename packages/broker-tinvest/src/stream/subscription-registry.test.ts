import { describe, expect, it } from 'vitest';
import { SubscriptionRegistry } from './subscription-registry.js';

const key = {
  instrumentUid: 'uid-1',
  interval: '5m' as const,
  candleSource: 'EXCHANGE' as const,
  waitingClose: false,
};

describe('SubscriptionRegistry', () => {
  it('dedupes provider subscriptions across consumers and unsubscribes only at zero refs', () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });

    const first = registry.acquire({
      connectionId: 'c1',
      requestId: 'r1',
      consumer: { consumerType: 'CHART', consumerId: 'conn:c1' },
      key,
    });
    const second = registry.acquire({
      connectionId: 'c2',
      requestId: 'r2',
      consumer: { consumerType: 'STRATEGY', consumerId: 'strategy-1' },
      key,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.providerCreated).toBe(true);
    expect(second.providerCreated).toBe(false);
    expect(registry.providerRefCount(first.lease.providerKey)).toBe(2);

    const releaseFirst = registry.release(first.lease.leaseId);
    expect(releaseFirst.shouldUnsubscribeProvider).toBe(false);
    expect(registry.providerRefCount(first.lease.providerKey)).toBe(1);

    const releaseSecond = registry.release(second.lease.leaseId);
    expect(releaseSecond.shouldUnsubscribeProvider).toBe(true);
    expect(registry.providerRefCount(first.lease.providerKey)).toBe(0);
  });

  it('rejects when capacity is exceeded', () => {
    const registry = new SubscriptionRegistry({ maxSubscriptionsPerStream: 1 });
    const first = registry.acquire({
      connectionId: 'c1',
      requestId: 'r1',
      consumer: { consumerType: 'CHART', consumerId: 'a' },
      key,
    });
    const second = registry.acquire({
      connectionId: 'c1',
      requestId: 'r2',
      consumer: { consumerType: 'CHART', consumerId: 'a' },
      key: { ...key, instrumentUid: 'uid-2' },
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }
    expect(second.reason).toBe('PROVIDER_LIMIT');
  });

  it('rate-limits new provider subscribe requests at 100/min', () => {
    let nowMs = Date.parse('2026-11-10T10:00:00.000Z');
    const registry = new SubscriptionRegistry({
      maxSubscribeRequestsPerMinute: 2,
      now: () => new Date(nowMs),
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });
    const a = registry.acquire({
      connectionId: 'c1',
      requestId: 'r1',
      consumer: { consumerType: 'CHART', consumerId: 'a' },
      key,
    });
    const b = registry.acquire({
      connectionId: 'c1',
      requestId: 'r2',
      consumer: { consumerType: 'CHART', consumerId: 'a' },
      key: { ...key, instrumentUid: 'uid-2' },
    });
    const c = registry.acquire({
      connectionId: 'c1',
      requestId: 'r3',
      consumer: { consumerType: 'CHART', consumerId: 'a' },
      key: { ...key, instrumentUid: 'uid-3' },
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(false);
    if (c.ok) {
      return;
    }
    expect(c.reason).toBe('RATE_LIMITED');
    nowMs += 61_000;
    const d = registry.acquire({
      connectionId: 'c1',
      requestId: 'r4',
      consumer: { consumerType: 'CHART', consumerId: 'a' },
      key: { ...key, instrumentUid: 'uid-3' },
    });
    expect(d.ok).toBe(true);
  });
});
