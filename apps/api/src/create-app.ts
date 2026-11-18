import type { AppEnv } from '@moex/config';
import type { FavoritesRepository } from '@moex/persistence';
import Fastify from 'fastify';
import { registerSandboxAdminRoutes, type SandboxAdminRouteDeps } from './admin/sandbox-routes.js';
import { registerLiveRoutes } from './live/live-routes.js';
import type { LiveRuntime } from './live/live-runtime.js';
import type { ChartLiveGateway } from './market/chart-live-gateway.js';
import type { ChartMarketDataDeps } from './market/fibonacci-pivot-service.js';
import { registerMarketRoutes } from './market/market-routes.js';

export type CreateAppOptions = {
  env: AppEnv;
  sandboxAdmin?: Omit<SandboxAdminRouteDeps, 'env'>;
  marketData?: ChartMarketDataDeps;
  chartLive?: ChartLiveGateway;
  liveRuntime?: LiveRuntime;
  favorites?: FavoritesRepository;
};

export async function createApp(options: CreateAppOptions) {
  const app = Fastify({ logger: false });

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    tradingMode: options.env.TRADING_MODE,
    liveTradingEnabled: options.env.LIVE_TRADING_ENABLED,
    marketDataEnabled: options.marketData !== undefined,
    chartLiveEnabled: options.chartLive !== undefined,
    liveRuntimeEnabled: options.liveRuntime !== undefined,
  }));

  if (options.sandboxAdmin !== undefined) {
    await registerSandboxAdminRoutes(app, {
      env: options.env,
      ...options.sandboxAdmin,
    });
  }

  if (options.marketData !== undefined) {
    await registerMarketRoutes(app, options.marketData);
  }

  if (options.liveRuntime !== undefined && options.favorites !== undefined) {
    await registerLiveRoutes(app, {
      liveRuntime: options.liveRuntime,
      favorites: options.favorites,
      ...(options.marketData !== undefined ? { marketData: options.marketData.marketData } : {}),
    });
  }

  return app;
}
