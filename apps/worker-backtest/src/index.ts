import { loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';

const env = loadEnv(process.env);
const logger = createLogger({ service: '@moex/worker-backtest', level: env.LOG_LEVEL });
logger.info('worker bootstrap', { tradingMode: env.TRADING_MODE });
