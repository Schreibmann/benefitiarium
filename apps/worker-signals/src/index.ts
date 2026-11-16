import {
  createGetFavorites,
  createIdentityInstrumentUidResolver,
  createSdkTinvestReadApi,
  createTinvestMarketDataProvider,
  createTinvestSdk,
  createTinvestStreamClient,
  FavoritesCandleStreamSync,
  StreamConnectionManager,
} from '@moex/broker-tinvest';
import { applyLocalEnvFile, loadEnv, requireTinvestToken } from '@moex/config';
import { createLogger } from '@moex/observability';
import { createMarketSignalsRepository, createPsqlDbClient } from '@moex/persistence';
import { parseSignalsWorkerConfig } from './parse-signals-config.js';
import { createPivotLevelCache } from './pivot-level-cache.js';
import { createPreviousPriceStore } from './previous-price-store.js';
import { createTriggerEvaluator } from './trigger-evaluator.js';

const STREAM_SUBSCRIPTION_CAP = 300;

async function main(): Promise<void> {
  applyLocalEnvFile();
  const env = loadEnv(process.env);
  const config = parseSignalsWorkerConfig(env);
  const logger = createLogger({ service: '@moex/worker-signals', level: env.LOG_LEVEL });

  const token = requireTinvestToken(
    env,
    env.TINVEST_READ_ONLY_TOKEN.trim().length > 0 ? 'read_only' : 'sandbox',
  );
  const sdkEnv = env.TINVEST_READ_ONLY_TOKEN.trim().length > 0 ? env.TINVEST_ENV : 'sandbox';

  const sdk = await createTinvestSdk({
    token,
    env: sdkEnv,
    baseUrl: env.TINVEST_BASE_URL,
  });
  const readApi = createSdkTinvestReadApi(sdk);
  const marketData = createTinvestMarketDataProvider({
    api: readApi,
    resolver: createIdentityInstrumentUidResolver(),
    isSandbox: sdkEnv === 'sandbox',
  });

  const db = createPsqlDbClient();
  const signalsRepo = createMarketSignalsRepository(db);
  const previousPrices = createPreviousPriceStore();
  const levelCache = createPivotLevelCache({ marketData });
  const evaluator = createTriggerEvaluator({
    marketData,
    levelCache,
    previousPrices,
    signalsRepo,
    evalMode: config.evalMode,
    triggers: config.triggers,
    approachPctByTimeframe: config.approachPctByTimeframe,
    telegramChannelId: config.telegramChannelId,
    telegramTopicAlerts: config.telegramTopicAlerts,
    timeZone: env.APP_TIMEZONE,
    onPersisted: (count) => {
      logger.info('signals persisted', { count });
    },
    onSkipped: (reason) => {
      logger.debug('candle skipped', { reason });
    },
  });

  const streamClient = await createTinvestStreamClient({
    token,
    env: sdkEnv,
    baseUrl: env.TINVEST_BASE_URL,
  });
  const streamManager = new StreamConnectionManager({
    client: streamClient,
    handlers: {
      onCandle: (candle) => {
        void evaluator.handleCandle(candle).catch((error: unknown) => {
          logger.error('trigger evaluation failed', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      },
      onError: (error) => {
        logger.error('stream error', {
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  });

  const favoritesSync = new FavoritesCandleStreamSync({
    fetchFavorites: createGetFavorites(streamClient),
    streamManager,
    intervals: config.streamIntervals,
    waitingClose: config.waitingClose,
    pollIntervalMs: config.favoritesPollMs,
    onError: (error) => {
      logger.error('favorites sync failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    },
  });

  await favoritesSync.start();
  const subscribed = favoritesSync.getLastKeys().length;
  if (subscribed > STREAM_SUBSCRIPTION_CAP) {
    logger.warn('subscription cap exceeded', {
      subscribed,
      cap: STREAM_SUBSCRIPTION_CAP,
    });
  }

  logger.info('worker-signals started', {
    tradingMode: env.TRADING_MODE,
    evalMode: config.evalMode,
    timeframes: config.timeframes.join(','),
    triggers: config.triggers.join(','),
    subscribed,
    hasTelegramChannel: config.telegramChannelId !== null,
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info('shutting down', { signal });
    try {
      await favoritesSync.stop();
    } catch (error: unknown) {
      logger.warn('favorites stop failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      await streamManager.shutdown();
    } catch (error: unknown) {
      logger.warn('stream shutdown failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (db.close !== undefined) {
      await db.close();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'error', msg: 'worker-signals failed', message }));
  process.exit(1);
});
