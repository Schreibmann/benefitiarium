export type TtlSingleflightCacheOptions = {
  ttlMs: number;
  now?: () => number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * In-process TTL cache with singleflight and optional stale fallback on loader errors.
 * Used to protect T-Invest catalog RPCs (GetFutures / GetShares) from bursts and rate limits.
 */
export function createTtlSingleflightCache<T>(options: TtlSingleflightCacheOptions) {
  const now = options.now ?? Date.now;
  let entry: CacheEntry<T> | null = null;
  let inflight: Promise<T> | null = null;

  async function get(loader: () => Promise<T>): Promise<T> {
    const ts = now();
    if (entry !== null && entry.expiresAt > ts) {
      return entry.value;
    }
    if (inflight !== null) {
      return inflight;
    }
    inflight = (async () => {
      try {
        const value = await loader();
        entry = { value, expiresAt: now() + options.ttlMs };
        return value;
      } catch (error: unknown) {
        if (entry !== null) {
          return entry.value;
        }
        throw error;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  function clear(): void {
    entry = null;
    inflight = null;
  }

  return { get, clear };
}

export function isResourceExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('RESOURCE_EXHAUSTED');
}
