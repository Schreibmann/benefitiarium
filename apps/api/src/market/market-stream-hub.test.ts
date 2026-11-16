import { formatProviderSubscriptionKey, SubscriptionRegistry } from '@moex/broker-tinvest';
import { describe, expect, it } from 'vitest';

const key = {
  instrumentUid: 'uid-1',
  interval: '5m' as const,
  candleSource: 'EXCHANGE' as const,
  waitingClose: false,
};

describe('shared stream lease reuse', () => {
  it('CHART and STRATEGY share one provider subscription', () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });

    const chart = registry.acquire({
      connectionId: 'ws-1',
      requestId: 'chart-r1',
      consumer: { consumerType: 'CHART', consumerId: 'conn:ws-1' },
      key,
    });
    const strategy = registry.acquire({
      connectionId: 'live-runtime',
      requestId: 'strategy:uid-1:5m',
      consumer: { consumerType: 'STRATEGY', consumerId: 'live-runtime' },
      key,
    });

    expect(chart.ok).toBe(true);
    expect(strategy.ok).toBe(true);
    if (!chart.ok || !strategy.ok) {
      return;
    }

    const providerKey = formatProviderSubscriptionKey(key);
    expect(chart.providerCreated).toBe(true);
    expect(strategy.providerCreated).toBe(false);
    expect(registry.providerRefCount(providerKey)).toBe(2);
    expect(registry.listActiveLeasesByConsumerType('CHART')).toHaveLength(1);
    expect(registry.listActiveLeasesByConsumerType('STRATEGY')).toHaveLength(1);

    const releaseStrategy = registry.release(strategy.lease.leaseId);
    expect(releaseStrategy.shouldUnsubscribeProvider).toBe(false);
    expect(registry.providerRefCount(providerKey)).toBe(1);

    const releaseChart = registry.release(chart.lease.leaseId);
    expect(releaseChart.shouldUnsubscribeProvider).toBe(true);
    expect(registry.providerRefCount(providerKey)).toBe(0);
  });

  it('stopping STRATEGY leaves CHART provider subscription intact', () => {
    const registry = new SubscriptionRegistry({
      createId: (() => {
        let n = 0;
        return () => `lease-${++n}`;
      })(),
    });

    registry.acquire({
      connectionId: 'ws-1',
      requestId: 'chart-r1',
      consumer: { consumerType: 'CHART', consumerId: 'conn:ws-1' },
      key,
    });
    const strategy = registry.acquire({
      connectionId: 'live-runtime',
      requestId: 'strategy:uid-1:5m',
      consumer: { consumerType: 'STRATEGY', consumerId: 'live-runtime' },
      key,
    });
    expect(strategy.ok).toBe(true);
    if (!strategy.ok) {
      return;
    }

    for (const lease of registry.releaseAllForConnection('live-runtime')) {
      void lease;
    }

    const providerKey = formatProviderSubscriptionKey(key);
    expect(registry.providerRefCount(providerKey)).toBe(1);
    expect(registry.listActiveLeasesByConsumerType('STRATEGY')).toHaveLength(0);
    expect(registry.listActiveLeasesByConsumerType('CHART')).toHaveLength(1);
  });
});
