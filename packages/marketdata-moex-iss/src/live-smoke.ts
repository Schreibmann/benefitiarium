import { applyLocalEnvFile, loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';
import { MoexIssClient } from './client.js';

const logger = createLogger({ service: '@moex/marketdata-moex-iss/live-smoke', level: 'info' });

async function main(): Promise<void> {
  applyLocalEnvFile();
  const env = loadEnv(process.env);
  const client = new MoexIssClient({
    baseUrl: env.MOEX_ISS_BASE_URL,
    timeoutMs: 20_000,
    maxRetries: 2,
    authMode: env.MOEX_ISS_AUTH_MODE,
    authToken: env.MOEX_ISS_TOKEN,
  });

  const engines = await client.getBlockRows('/engines.json', 'engines');
  const stock = engines.find((row) => row.name === 'stock');
  if (!stock) {
    throw new Error('stock engine not found in ISS engines.json');
  }

  const sber = await client.getJson(
    '/engines/stock/markets/shares/boards/TQBR/securities/SBER.json',
  );
  const securities = sber.securities;
  if (!securities) {
    throw new Error('SBER securities block missing');
  }

  logger.info('MOEX ISS anonymous smoke ok', {
    engines: engines.length,
    sberColumnCount: securities.columns.length,
    authMode: env.MOEX_ISS_AUTH_MODE,
  });
}

main().catch((error: unknown) => {
  logger.error('MOEX ISS smoke failed', { error: String(error) });
  process.exitCode = 1;
});
