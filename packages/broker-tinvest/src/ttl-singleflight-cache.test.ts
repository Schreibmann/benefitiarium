import { describe, expect, it } from 'vitest';
import { createTtlSingleflightCache, isResourceExhaustedError } from './ttl-singleflight-cache.js';

describe('createTtlSingleflightCache', () => {
  it('coalesces concurrent loads into one loader call', async () => {
    let loads = 0;
    let now = 1_000;
    const cache = createTtlSingleflightCache<string>({
      ttlMs: 60_000,
      now: () => now,
    });

    const loader = async () => {
      loads += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'ok';
    };

    const [a, b, c] = await Promise.all([cache.get(loader), cache.get(loader), cache.get(loader)]);
    expect([a, b, c]).toEqual(['ok', 'ok', 'ok']);
    expect(loads).toBe(1);

    now += 10_000;
    await cache.get(loader);
    expect(loads).toBe(1);
  });

  it('returns stale value when loader hits RESOURCE_EXHAUSTED after a warm cache', async () => {
    let now = 1_000;
    let fail = false;
    const cache = createTtlSingleflightCache<string>({
      ttlMs: 1_000,
      now: () => now,
    });

    await cache.get(async () => 'fresh');
    now += 5_000;
    fail = true;

    const value = await cache.get(async () => {
      if (fail) {
        throw new Error('RESOURCE_EXHAUSTED: quota');
      }
      return 'new';
    });
    expect(value).toBe('fresh');
  });

  it('detects RESOURCE_EXHAUSTED messages', () => {
    expect(
      isResourceExhaustedError(
        new Error(
          '/tinkoff.public.invest.api.contract.v1.InstrumentsService/Futures RESOURCE_EXHAUSTED: ',
        ),
      ),
    ).toBe(true);
    expect(isResourceExhaustedError(new Error('boom'))).toBe(false);
  });
});
