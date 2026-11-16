import type { GetFavoritesFn } from '../get-favorites.js';
import { resolveFavoriteStreamInstrumentId } from '../get-favorites.js';
import type { TinvestFavoriteInstrumentRaw } from '../raw.js';
import type { StreamCandleInterval } from './map-subscription-interval.js';
import type { ProviderSubscriptionKey } from './provider-subscription-key.js';

export type FavoritesStreamManager = {
  syncDesiredSubscriptions: (keys: readonly ProviderSubscriptionKey[]) => Promise<void>;
};

export type FavoritesCandleStreamSyncOptions = {
  fetchFavorites: GetFavoritesFn;
  streamManager: FavoritesStreamManager;
  /**
   * Preferred: subscribe each favorite on every listed interval.
   * If omitted, `interval` must be provided (single-interval mode).
   */
  intervals?: readonly StreamCandleInterval[];
  /** @deprecated Prefer `intervals`. Kept for single-interval callers. */
  interval?: StreamCandleInterval;
  /** Default true — closed bars for strategy/signal consumers. */
  waitingClose?: boolean;
  groupId?: string;
  /**
   * Keep only instruments that pass the predicate.
   * Default: apiTradeAvailableFlag === true.
   */
  filter?: (favorite: TinvestFavoriteInstrumentRaw) => boolean;
  resolveInstrumentId?: (favorite: TinvestFavoriteInstrumentRaw) => string | null;
  /** When set, `start()` polls GetFavorites and re-syncs on this period. */
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onError?: (error: unknown) => void;
};

export type FavoritesCandleStreamSyncResult = {
  keys: ProviderSubscriptionKey[];
  favoriteCount: number;
  subscribedCount: number;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultFilter(favorite: TinvestFavoriteInstrumentRaw): boolean {
  return favorite.apiTradeAvailableFlag;
}

function resolveIntervals(options: FavoritesCandleStreamSyncOptions): StreamCandleInterval[] {
  if (options.intervals !== undefined && options.intervals.length > 0) {
    return [...options.intervals];
  }
  if (options.interval !== undefined) {
    return [options.interval];
  }
  throw new Error('FavoritesCandleStreamSync requires intervals or interval');
}

/**
 * Build provider candle subscription keys from favorites rows.
 */
export function favoritesToProviderSubscriptionKeys(input: {
  favorites: readonly TinvestFavoriteInstrumentRaw[];
  intervals: readonly StreamCandleInterval[];
  waitingClose: boolean;
  filter?: (favorite: TinvestFavoriteInstrumentRaw) => boolean;
  resolveInstrumentId?: (favorite: TinvestFavoriteInstrumentRaw) => string | null;
}): ProviderSubscriptionKey[] {
  const filter = input.filter ?? defaultFilter;
  const resolveId = input.resolveInstrumentId ?? resolveFavoriteStreamInstrumentId;
  const keys: ProviderSubscriptionKey[] = [];
  const seen = new Set<string>();

  for (const favorite of input.favorites) {
    if (!filter(favorite)) {
      continue;
    }
    const instrumentUid = resolveId(favorite);
    if (instrumentUid === null || instrumentUid.length === 0) {
      continue;
    }
    for (const interval of input.intervals) {
      const dedupeKey = `${instrumentUid}|${interval}|${input.waitingClose ? 'c' : 'i'}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      keys.push({
        instrumentUid,
        interval,
        candleSource: 'EXCHANGE',
        waitingClose: input.waitingClose,
      });
    }
  }

  return keys;
}

/**
 * Backend consumer: GetFavorites → StreamConnectionManager.syncDesiredSubscriptions.
 * Diff/unsubscribe is handled by the stream manager; this class only rebuilds the desired set.
 * Not for UI chart leases — use as a SYSTEM/STRATEGY batch sync (watchlist worker).
 */
export class FavoritesCandleStreamSync {
  private readonly fetchFavorites: GetFavoritesFn;
  private readonly streamManager: FavoritesStreamManager;
  private readonly intervals: readonly StreamCandleInterval[];
  private readonly waitingClose: boolean;
  private readonly groupId: string | undefined;
  private readonly filter: (favorite: TinvestFavoriteInstrumentRaw) => boolean;
  private readonly resolveInstrumentId: (favorite: TinvestFavoriteInstrumentRaw) => string | null;
  private readonly pollIntervalMs: number | null;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly onError: ((error: unknown) => void) | undefined;
  private lastKeys: ProviderSubscriptionKey[] = [];
  private running = false;
  private pollLoop: Promise<void> | null = null;
  private wakePoll: (() => void) | null = null;

  constructor(options: FavoritesCandleStreamSyncOptions) {
    this.fetchFavorites = options.fetchFavorites;
    this.streamManager = options.streamManager;
    this.intervals = resolveIntervals(options);
    this.waitingClose = options.waitingClose ?? true;
    this.groupId =
      options.groupId !== undefined && options.groupId.trim().length > 0
        ? options.groupId.trim()
        : undefined;
    this.filter = options.filter ?? defaultFilter;
    this.resolveInstrumentId = options.resolveInstrumentId ?? resolveFavoriteStreamInstrumentId;
    this.pollIntervalMs =
      typeof options.pollIntervalMs === 'number' &&
      Number.isFinite(options.pollIntervalMs) &&
      options.pollIntervalMs > 0
        ? options.pollIntervalMs
        : null;
    this.sleep = options.sleep ?? defaultSleep;
    this.onError = options.onError;
  }

  getLastKeys(): readonly ProviderSubscriptionKey[] {
    return this.lastKeys;
  }

  isRunning(): boolean {
    return this.running;
  }

  async syncOnce(): Promise<FavoritesCandleStreamSyncResult> {
    const fetchInput = this.groupId !== undefined ? { groupId: this.groupId } : undefined;
    const favorites = await this.fetchFavorites(fetchInput);
    const keys = favoritesToProviderSubscriptionKeys({
      favorites,
      intervals: this.intervals,
      waitingClose: this.waitingClose,
      filter: this.filter,
      resolveInstrumentId: this.resolveInstrumentId,
    });
    await this.streamManager.syncDesiredSubscriptions(keys);
    this.lastKeys = keys;
    return {
      keys,
      favoriteCount: favorites.length,
      subscribedCount: keys.length,
    };
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    await this.syncOnce();
    if (this.pollIntervalMs === null) {
      return;
    }
    this.pollLoop = this.runPollLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.wakePoll?.();
    this.wakePoll = null;
    if (this.pollLoop !== null) {
      try {
        await this.pollLoop;
      } catch {
        // swallow on stop
      }
      this.pollLoop = null;
    }
  }

  private async interruptibleSleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (this.wakePoll === finish) {
          this.wakePoll = null;
        }
        resolve();
      };
      this.wakePoll = finish;
      void this.sleep(ms).then(finish);
    });
  }

  private async runPollLoop(): Promise<void> {
    const period = this.pollIntervalMs;
    if (period === null) {
      return;
    }
    while (this.running) {
      await this.interruptibleSleep(period);
      if (!this.running) {
        return;
      }
      try {
        await this.syncOnce();
      } catch (error: unknown) {
        this.onError?.(error);
      }
    }
  }
}
