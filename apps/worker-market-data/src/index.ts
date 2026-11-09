import { applyLocalEnvFile, loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';

applyLocalEnvFile();
const env = loadEnv(process.env);
const logger = createLogger({ service: '@moex/worker-market-data', level: env.LOG_LEVEL });
logger.info('worker bootstrap', { tradingMode: env.TRADING_MODE });
