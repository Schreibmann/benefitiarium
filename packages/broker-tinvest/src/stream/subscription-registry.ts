import { randomUUID } from 'node:crypto';
import {
  formatProviderSubscriptionKey,
  type ProviderSubscriptionKey,
} from './provider-subscription-key.js';

export type ConsumerType = 'CHART' | 'STRATEGY' | 'ALERT' | 'SYSTEM';

export type ConsumerRef = {
  consumerType: ConsumerType;
  consumerId: string;
};

export type LeaseStatus =
  | 'PENDING'
  | 'SUBSCRIBING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'REJECTED'
  | 'INACTIVE';

export type ChartLease = {
  leaseId: string;
  connectionId: string;
  requestId: string;
  consumer: ConsumerRef;
  providerKey: string;
  key: ProviderSubscriptionKey;
  status: LeaseStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderSubscriptionState = {
  key: string;
  parsed: ProviderSubscriptionKey;
  refCount: number;
  status: LeaseStatus;
  providerSubscriptionId: string | null;
  consumers: Set<string>;
};

const MAX_SUBSCRIPTIONS_PER_STREAM = 300;
/** T-Invest limit: up to 100 subscription requests per minute. */
const MAX_SUBSCRIBE_REQUESTS_PER_MINUTE = 100;

export type SubscriptionRegistryOptions = {
  maxSubscriptionsPerStream?: number;
  maxSubscribeRequestsPerMinute?: number;
  now?: () => Date;
  createId?: () => string;
};

export class SubscriptionRegistry {
  private readonly leases = new Map<string, ChartLease>();
  private readonly byRequestId = new Map<string, string>();
  private readonly providers = new Map<string, ProviderSubscriptionState>();
  private readonly subscribeRequestTimestamps: number[] = [];
  private readonly maxSubscriptionsPerStream: number;
  private readonly maxSubscribeRequestsPerMinute: number;
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(options: SubscriptionRegistryOptions = {}) {
    this.maxSubscriptionsPerStream =
      options.maxSubscriptionsPerStream ?? MAX_SUBSCRIPTIONS_PER_STREAM;
    this.maxSubscribeRequestsPerMinute =
      options.maxSubscribeRequestsPerMinute ?? MAX_SUBSCRIBE_REQUESTS_PER_MINUTE;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? (() => randomUUID());
  }

  acquire(input: {
    connectionId: string;
    requestId: string;
    consumer: ConsumerRef;
    key: ProviderSubscriptionKey;
  }):
    | { ok: true; lease: ChartLease; providerCreated: boolean }
    | {
        ok: false;
        reason: 'PROVIDER_LIMIT' | 'DUPLICATE_REQUEST' | 'RATE_LIMITED';
        lease: ChartLease | null;
      } {
    const existingLeaseId = this.byRequestId.get(`${input.connectionId}:${input.requestId}`);
    if (existingLeaseId !== undefined) {
      const existing = this.leases.get(existingLeaseId);
      if (existing !== undefined) {
        return { ok: false, reason: 'DUPLICATE_REQUEST', lease: existing };
      }
    }

    const providerKey = formatProviderSubscriptionKey(input.key);
    let provider = this.providers.get(providerKey);
    const providerCreated = provider === undefined;
    if (provider === undefined) {
      if (this.providers.size >= this.maxSubscriptionsPerStream) {
        return { ok: false, reason: 'PROVIDER_LIMIT', lease: null };
      }
      if (!this.tryConsumeSubscribeRequestSlot()) {
        return { ok: false, reason: 'RATE_LIMITED', lease: null };
      }
      provider = {
        key: providerKey,
        parsed: input.key,
        refCount: 0,
        status: 'PENDING',
        providerSubscriptionId: null,
        consumers: new Set(),
      };
      this.providers.set(providerKey, provider);
    }

    const stamp = this.now().toISOString();
    const lease: ChartLease = {
      leaseId: this.createId(),
      connectionId: input.connectionId,
      requestId: input.requestId,
      consumer: input.consumer,
      providerKey,
      key: input.key,
      status: provider.status === 'ACTIVE' ? 'ACTIVE' : 'SUBSCRIBING',
      reason: null,
      createdAt: stamp,
      updatedAt: stamp,
    };

    provider.refCount += 1;
    provider.consumers.add(lease.leaseId);
    if (provider.status === 'PENDING' || provider.status === 'INACTIVE') {
      provider.status = 'SUBSCRIBING';
    }

    this.leases.set(lease.leaseId, lease);
    this.byRequestId.set(`${input.connectionId}:${input.requestId}`, lease.leaseId);
    return { ok: true, lease, providerCreated };
  }

  release(leaseId: string): {
    lease: ChartLease | null;
    providerKey: string | null;
    providerRefCount: number;
    shouldUnsubscribeProvider: boolean;
  } {
    const lease = this.leases.get(leaseId);
    if (lease === undefined) {
      return {
        lease: null,
        providerKey: null,
        providerRefCount: 0,
        shouldUnsubscribeProvider: false,
      };
    }

    const stamp = this.now().toISOString();
    const inactive: ChartLease = {
      ...lease,
      status: 'INACTIVE',
      updatedAt: stamp,
    };
    this.leases.set(leaseId, inactive);
    this.byRequestId.delete(`${lease.connectionId}:${lease.requestId}`);

    const provider = this.providers.get(lease.providerKey);
    if (provider === undefined) {
      return {
        lease: inactive,
        providerKey: lease.providerKey,
        providerRefCount: 0,
        shouldUnsubscribeProvider: false,
      };
    }

    provider.consumers.delete(leaseId);
    provider.refCount = Math.max(0, provider.refCount - 1);
    const shouldUnsubscribeProvider = provider.refCount === 0;
    if (shouldUnsubscribeProvider) {
      this.providers.delete(lease.providerKey);
    }

    return {
      lease: inactive,
      providerKey: lease.providerKey,
      providerRefCount: provider.refCount,
      shouldUnsubscribeProvider,
    };
  }

  releaseAllForConnection(connectionId: string): Array<{
    lease: ChartLease;
    providerKey: string;
    shouldUnsubscribeProvider: boolean;
  }> {
    const released: Array<{
      lease: ChartLease;
      providerKey: string;
      shouldUnsubscribeProvider: boolean;
    }> = [];
    for (const lease of this.leases.values()) {
      if (lease.connectionId === connectionId && lease.status !== 'INACTIVE') {
        const result = this.release(lease.leaseId);
        if (result.lease !== null && result.providerKey !== null) {
          released.push({
            lease: result.lease,
            providerKey: result.providerKey,
            shouldUnsubscribeProvider: result.shouldUnsubscribeProvider,
          });
        }
      }
    }
    return released;
  }

  getLease(leaseId: string): ChartLease | null {
    return this.leases.get(leaseId) ?? null;
  }

  setLeaseStatus(leaseId: string, status: LeaseStatus, reason: string | null = null): void {
    const lease = this.leases.get(leaseId);
    if (lease === undefined) {
      return;
    }
    this.leases.set(leaseId, {
      ...lease,
      status,
      reason,
      updatedAt: this.now().toISOString(),
    });
  }

  setProviderStatus(
    providerKey: string,
    status: LeaseStatus,
    providerSubscriptionId: string | null = null,
  ): void {
    const provider = this.providers.get(providerKey);
    if (provider === undefined) {
      return;
    }
    provider.status = status;
    if (providerSubscriptionId !== null) {
      provider.providerSubscriptionId = providerSubscriptionId;
    }
    for (const leaseId of provider.consumers) {
      this.setLeaseStatus(leaseId, status);
    }
  }

  desiredProviderKeys(): ProviderSubscriptionKey[] {
    return [...this.providers.values()].map((item) => item.parsed);
  }

  providerRefCount(providerKey: string): number {
    return this.providers.get(providerKey)?.refCount ?? 0;
  }

  listActiveLeasesForProvider(providerKey: string): ChartLease[] {
    const out: ChartLease[] = [];
    for (const lease of this.leases.values()) {
      if (lease.providerKey === providerKey && lease.status !== 'INACTIVE') {
        out.push(lease);
      }
    }
    return out;
  }

  listActiveLeases(): ChartLease[] {
    const out: ChartLease[] = [];
    for (const lease of this.leases.values()) {
      if (lease.status !== 'INACTIVE') {
        out.push(lease);
      }
    }
    return out;
  }

  listActiveLeasesByConsumerType(consumerType: ConsumerType): ChartLease[] {
    return this.listActiveLeases().filter((lease) => lease.consumer.consumerType === consumerType);
  }

  private tryConsumeSubscribeRequestSlot(): boolean {
    const nowMs = this.now().getTime();
    const windowStart = nowMs - 60_000;
    while (
      this.subscribeRequestTimestamps.length > 0 &&
      (this.subscribeRequestTimestamps[0] ?? 0) < windowStart
    ) {
      this.subscribeRequestTimestamps.shift();
    }
    if (this.subscribeRequestTimestamps.length >= this.maxSubscribeRequestsPerMinute) {
      return false;
    }
    this.subscribeRequestTimestamps.push(nowMs);
    return true;
  }
}
