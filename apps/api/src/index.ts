import { applyLocalEnvFile, loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';
import { composeMarketDataDeps } from './compose-market-data.js';
import { composeSandboxAdminDeps } from './compose-sandbox-admin.js';
import { createApp } from './create-app.js';

applyLocalEnvFile();
const env = loadEnv(process.env);
const logger = createLogger({ service: '@moex/api', level: env.LOG_LEVEL });

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  const adminConfigured = env.ADMIN_API_TOKEN.trim().length > 0;
  const sandboxAdmin = adminConfigured
    ? await composeSandboxAdminDeps(env).then(({ storeMode, ...deps }) => ({
        deps,
        storeMode,
      }))
    : null;

  const market = await composeMarketDataDeps(env);

  const app = await createApp({
    env,
    ...(sandboxAdmin !== null ? { sandboxAdmin: sandboxAdmin.deps } : {}),
    ...(market !== null ? { marketData: market.chartDeps } : {}),
    ...(market?.chartLive !== null && market?.chartLive !== undefined
      ? { chartLive: market.chartLive }
      : {}),
  });
  await app.listen({ port, host: '0.0.0.0' });

  if (market?.chartLive !== null && market?.chartLive !== undefined) {
    market.chartLive.attach(app.server);
  }

  logger.info('api listening', {
    port,
    sandboxAdminEnabled: sandboxAdmin !== null,
    sandboxAdminStore: sandboxAdmin?.storeMode ?? null,
    marketDataEnabled: market !== null,
    chartLiveEnabled: market?.chartLive !== null && market?.chartLive !== undefined,
    liveCandleStreamLog: env.LIVE_CANDLE_STREAM_LOG,
  });
}

main().catch((error: unknown) => {
  logger.error('api failed to start', { error: String(error) });
  process.exit(1);
});
