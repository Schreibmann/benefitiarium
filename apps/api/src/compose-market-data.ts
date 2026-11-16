import {
  createHistoryTradesClient,
  createIdentityInstrumentUidResolver,
  createSdkTinvestReadApi,
  createTinvestMarketDataProvider,
  createTinvestSdk,
  createTinvestStreamClient,
} from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import { parseTelegramTopicId, resolveTelegramChatId, resolveTinvestToken } from '@moex/config';
import { createLogger } from '@moex/observability';
import {
  createFuturesCatalogCacheRepository,
  createLiveRuntimeStateRepository,
  createLiveSignalsRepository,
  createMarketSignalsRepository,
  createMemoryLiveRuntimeStateRepository,
  createMemoryLiveSignalsRepository,
  createMemoryMarketSignalsStore,
  createMemoryOutboxStore,
  createOutboxRepository,
  createPsqlDbClient,
  type DbClient,
  type FavoritesRepository,
  type FuturesCatalogCacheRepository,
  type LiveRuntimeStateRepository,
  type LiveSignalsRepository,
  type MarketSignalsRepository,
  type OutboxRepository,
} from '@moex/persistence';
import { createBrokerFavoritesRepository } from './live/broker-favorites.js';
import { createLevelAlertEngine } from './live/level-alert-engine.js';
import { createLiveMarketAnalyzer } from './live/live-market-analyzer.js';
import { createLiveRuntime, type LiveRuntime } from './live/live-runtime.js';
import {
  createQueueTelegramNotifier,
  createStubTelegramNotifier,
  type TelegramNotifier,
} from './live/telegram-notifier.js';
import { type ChartLiveGateway, createChartLiveGateway } from './market/chart-live-gateway.js';
import type { ChartMarketDataDeps } from './market/fibonacci-pivot-service.js';
import { createLiveCandleStreamLog } from './market/live-candle-stream-log.js';
import { createMarketStreamHub, type MarketStreamHub } from './market/market-stream-hub.js';
import { createTelegramTopicPublisher } from './notifications/telegram-topic-publisher.js';

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

async function liveSchemaReady(db: DbClient): Promise<boolean> {
  try {
    const exists = await db.queryJsonValue<boolean | null>(
      `SELECT to_json(to_regclass('public.live_runtime_state') IS NOT NULL)`,
    );
    return exists === true;
  } catch {
    return false;
  }
}

async function marketSignalsSchemaReady(db: DbClient): Promise<boolean> {
  try {
    const exists = await db.queryJsonValue<boolean | null>(
      `SELECT to_json(to_regclass('public.notifications') IS NOT NULL)`,
    );
    return exists === true;
  } catch {
    return false;
  }
}

async function createLivePersistence(): Promise<{
  runtimeState: LiveRuntimeStateRepository;
  signals: LiveSignalsRepository;
  outbox: OutboxRepository;
  marketSignals: MarketSignalsRepository;
}> {
  const db = createPsqlDbClient();
  if (!(await canReachPostgres(db)) || !(await liveSchemaReady(db))) {
    if (db.close !== undefined) {
      await db.close();
    }
    return {
      runtimeState: createMemoryLiveRuntimeStateRepository(),
      signals: createMemoryLiveSignalsRepository(),
      outbox: createMemoryOutboxStore(),
      marketSignals: createMemoryMarketSignalsStore(),
    };
  }
  const marketSignals = (await marketSignalsSchemaReady(db))
    ? createMarketSignalsRepository(db)
    : createMemoryMarketSignalsStore();
  return {
    runtimeState: createLiveRuntimeStateRepository(db),
    signals: createLiveSignalsRepository(db),
    outbox: createOutboxRepository(db),
    marketSignals,
  };
}

function createLiveTelegramWiring(input: {
  env: AppEnv;
  marketSignals: MarketSignalsRepository;
  outbox: OutboxRepository;
  logger: {
    info: (
      message: string,
      fields?: Record<string, string | number | boolean | null | undefined>,
    ) => void;
  };
}): {
  telegram: TelegramNotifier;
  topics: ReturnType<typeof createTelegramTopicPublisher>;
} {
  const chatId = resolveTelegramChatId(input.env);
  const topicAlerts = parseTelegramTopicId(input.env.TELEGRAM_TOPIC_ALERTS);
  const topicLogs = parseTelegramTopicId(input.env.TELEGRAM_TOPIC_LOGS);
  const topicErrors = parseTelegramTopicId(input.env.TELEGRAM_TOPIC_ERRORS);
  const topics = createTelegramTopicPublisher({
    marketSignals: input.marketSignals,
    chatId,
    topicLogs,
    topicErrors,
  });
  if (chatId !== null && topicAlerts !== null) {
    return {
      telegram: createQueueTelegramNotifier({
        marketSignals: input.marketSignals,
        outbox: input.outbox,
        chatId,
        topicAlerts,
        logger: input.logger,
      }),
      topics,
    };
  }
  return {
    telegram: createStubTelegramNotifier({
      outbox: input.outbox,
      logger: input.logger,
    }),
    topics,
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

  const livePersistence = await createLivePersistence();
  const favorites = createBrokerFavoritesRepository(api);
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
    const levelAlerts = createLevelAlertEngine();
    const analyzer = createLiveMarketAnalyzer({
      marketData,
      levelAlerts,
    });
    const telegramWiring = createLiveTelegramWiring({
      env,
      marketSignals: livePersistence.marketSignals,
      outbox: livePersistence.outbox,
      logger: liveLogger,
    });
    liveRuntime = createLiveRuntime({
      hub,
      favorites,
      runtimeState: livePersistence.runtimeState,
      signals: livePersistence.signals,
      telegram: telegramWiring.telegram,
      topics: telegramWiring.topics,
      streamLog,
      evaluateClosedBar: analyzer.evaluateClosedBar,
      evaluateLiveAlerts: analyzer.evaluateLiveAlerts,
      analysisIntervals: ['5m'],
    });
    streamLog.clientEvent('live candle stream logging enabled', {
      chartLive: true,
      liveRuntime: true,
    });
  } catch (error: unknown) {
    chartLive = null;
    streamHub = null;
    liveRuntime = null;
    if (env.LIVE_CANDLE_STREAM_LOG) {
      liveLogger.warn('live candle stream / LiveRuntime init failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  return {
    chartDeps,
    chartLive,
    streamHub,
    liveRuntime,
    favorites,
  };
}
