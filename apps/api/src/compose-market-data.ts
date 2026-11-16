import {
  createHistoryTradesClient,
  createIdentityInstrumentUidResolver,
  createSdkTinvestReadApi,
  createTinvestMarketDataProvider,
  createTinvestSdk,
  createTinvestStreamClient,
} from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import { resolveTinvestToken } from '@moex/config';
import { createLogger } from '@moex/observability';
import {
  createFavoritesRepository,
  createFuturesCatalogCacheRepository,
  createLiveRuntimeStateRepository,
  createLiveSignalsRepository,
  createMemoryFavoritesRepository,
  createMemoryLiveRuntimeStateRepository,
  createMemoryLiveSignalsRepository,
  createMemoryOutboxStore,
  createOutboxRepository,
  createPsqlDbClient,
  type DbClient,
  type FavoritesRepository,
  type FuturesCatalogCacheRepository,
  type LiveRuntimeStateRepository,
  type LiveSignalsRepository,
  type OutboxRepository,
} from '@moex/persistence';
import { createCloseEmittedHoldEvaluator } from './live/closed-bar-evaluator.js';
import { createLiveRuntime, type LiveRuntime } from './live/live-runtime.js';
import { createStubTelegramNotifier } from './live/telegram-notifier.js';
import { type ChartLiveGateway, createChartLiveGateway } from './market/chart-live-gateway.js';
import type { ChartMarketDataDeps } from './market/fibonacci-pivot-service.js';
import { createLiveCandleStreamLog } from './market/live-candle-stream-log.js';
import { createMarketStreamHub, type MarketStreamHub } from './market/market-stream-hub.js';

async function canReachPostgres(db: DbClient): Promise<boolean> {
  try {
    await db.queryJsonValue(`SELECT to_json(1)`);
    return true;
  } catch {
    return false;
  }
}

async function tryCreateFuturesCatalogCache(): Promise<FuturesCatalogCacheRepository | undefined> {
  const db = createPsqlDbClient();
  if (!(await canReachPostgres(db))) {
    if (db.close !== undefined) {
      await db.close();
    }
    return undefined;
  }
  return createFuturesCatalogCacheRepository(db);
}

async function createLiveStores(): Promise<{
  favorites: FavoritesRepository;
  runtimeState: LiveRuntimeStateRepository;
  signals: LiveSignalsRepository;
  outbox: OutboxRepository;
}> {
  const db = createPsqlDbClient();
  if (!(await canReachPostgres(db))) {
    if (db.close !== undefined) {
      await db.close();
    }
    return {
      favorites: createMemoryFavoritesRepository(),
      runtimeState: createMemoryLiveRuntimeStateRepository(),
      signals: createMemoryLiveSignalsRepository(),
      outbox: createMemoryOutboxStore(),
    };
  }
  return {
    favorites: createFavoritesRepository(db),
    runtimeState: createLiveRuntimeStateRepository(db),
    signals: createLiveSignalsRepository(db),
    outbox: createOutboxRepository(db),
  };
}

export type ComposedMarketData = {
  chartDeps: ChartMarketDataDeps;
  chartLive: ChartLiveGateway | null;
  streamHub: MarketStreamHub | null;
  liveRuntime: LiveRuntime | null;
  favorites: FavoritesRepository;
};

/**
 * Compose market-data deps for chart/pivot read routes, shared stream hub, and Live runtime.
 * Prefers TINVEST_READ_ONLY_TOKEN; falls back to sandbox token for sandbox env.
 *
 * Stream + Live run in-process with the API for this stage (workers host later).
 */
export async function composeMarketDataDeps(env: AppEnv): Promise<ComposedMarketData | null> {
  const readOnly = resolveTinvestToken(env, 'read_only');
  const sandbox = resolveTinvestToken(env, 'sandbox');
  const token = readOnly ?? sandbox;
  if (token === null) {
    return null;
  }

  const sdkEnv = readOnly !== null ? env.TINVEST_ENV : 'sandbox';
  const sdk = await createTinvestSdk({
    token,
    env: sdkEnv,
    baseUrl: env.TINVEST_BASE_URL,
  });
  const api = createSdkTinvestReadApi(sdk);
  // History MD trades archives need a production-capable token (sandbox often 401/403).
  const historyTrades =
    readOnly !== null ? createHistoryTradesClient({ token: readOnly }) : undefined;
  const marketData = createTinvestMarketDataProvider({
    api,
    resolver: createIdentityInstrumentUidResolver(),
    isSandbox: sdkEnv === 'sandbox',
    ...(historyTrades !== undefined ? { historyTrades } : {}),
  });
  const futuresCatalogCache = await tryCreateFuturesCatalogCache();
  const chartDeps: ChartMarketDataDeps = {
    marketData,
    ...(futuresCatalogCache !== undefined ? { futuresCatalogCache } : {}),
  };

  const liveStores = await createLiveStores();
  const liveLogger = createLogger({
    service: '@moex/api/live-runtime',
    level: env.LOG_LEVEL,
  });

  let chartLive: ChartLiveGateway | null = null;
  let streamHub: MarketStreamHub | null = null;
  let liveRuntime: LiveRuntime | null = null;

  try {
    const streamClient = await createTinvestStreamClient({
      token,
      env: sdkEnv,
      baseUrl: env.TINVEST_BASE_URL,
    });
    const streamLog = createLiveCandleStreamLog({
      enabled: env.LIVE_CANDLE_STREAM_LOG,
      logger: createLogger({
        service: '@moex/api/live-candle-stream',
        level: env.LOG_LEVEL,
      }),
    });
    const hub = createMarketStreamHub({ client: streamClient, streamLog });
    streamHub = hub;
    chartLive = createChartLiveGateway({ hub, streamLog });
    liveRuntime = createLiveRuntime({
      hub,
      favorites: liveStores.favorites,
      runtimeState: liveStores.runtimeState,
      signals: liveStores.signals,
      telegram: createStubTelegramNotifier({
        outbox: liveStores.outbox,
        logger: liveLogger,
      }),
      // Closed-bar hold monitor until full TSE strategy loop is wired into LiveRuntime.
      evaluateClosedBar: createCloseEmittedHoldEvaluator(),
      analysisIntervals: ['5m'],
    });
  } catch {
    chartLive = null;
    streamHub = null;
    liveRuntime = null;
  }

  return {
    chartDeps,
    chartLive,
    streamHub,
    liveRuntime,
    favorites: liveStores.favorites,
  };
}
