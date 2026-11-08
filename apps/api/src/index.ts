import Fastify from 'fastify';
import { loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';

const env = loadEnv(process.env);
const logger = createLogger({ service: '@moex/api', level: env.LOG_LEVEL });

const app = Fastify({ logger: false });

app.get('/api/v1/health', async () => {
  return {
    status: 'ok',
    tradingMode: env.TRADING_MODE,
    liveTradingEnabled: env.LIVE_TRADING_ENABLED,
  };
});

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  await app.listen({ port, host: '0.0.0.0' });
  logger.info('api listening', { port });
}

main().catch((error: unknown) => {
  logger.error('api failed to start', { error: String(error) });
  process.exit(1);
});
