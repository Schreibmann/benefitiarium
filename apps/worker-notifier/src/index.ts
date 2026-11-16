import { applyLocalEnvFile, loadEnv, resolveTelegramChatId } from '@moex/config';
import { createLogger } from '@moex/observability';
import { createMarketSignalsRepository, createPsqlDbClient } from '@moex/persistence';
import { createNotifierPollLoop } from './poll-loop.js';
import { createTelegramClient } from './telegram-client.js';

async function main(): Promise<void> {
  applyLocalEnvFile();
  const env = loadEnv(process.env);
  const logger = createLogger({ service: '@moex/worker-notifier', level: env.LOG_LEVEL });

  const token = env.TELEGRAM_BOT_TOKEN.trim();
  if (token.length === 0) {
    throw new Error('TELEGRAM_BOT_TOKEN is required for worker-notifier');
  }
  if (resolveTelegramChatId(env) === null) {
    logger.warn('TELEGRAM_CHAT_ID is empty; pending notifications still process by target');
  }

  const db = createPsqlDbClient();
  const repo = createMarketSignalsRepository(db);
  const telegram = createTelegramClient({ botToken: token });
  const loop = createNotifierPollLoop({
    repo,
    telegram,
    pollIntervalMs: env.NOTIFIER_POLL_MS,
    onSent: (notification, messageId) => {
      logger.info('notification sent', {
        notificationId: notification.id,
        messageId,
      });
    },
    onFailed: (notification, error) => {
      logger.warn('notification delivery failed', {
        notificationId: notification.id,
        message: error instanceof Error ? error.message : String(error),
      });
    },
  });

  await loop.start();
  logger.info('worker-notifier started', {
    pollMs: env.NOTIFIER_POLL_MS,
    tradingMode: env.TRADING_MODE,
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info('shutting down', { signal });
    try {
      await loop.stop();
    } catch (error: unknown) {
      logger.warn('poll loop stop failed', {
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
  console.error(JSON.stringify({ level: 'error', msg: 'worker-notifier failed', message }));
  process.exit(1);
});
