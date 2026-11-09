import type { AppEnv } from '@moex/config';
import Fastify from 'fastify';
import { registerSandboxAdminRoutes, type SandboxAdminRouteDeps } from './admin/sandbox-routes.js';

export type CreateAppOptions = {
  env: AppEnv;
  sandboxAdmin?: Omit<SandboxAdminRouteDeps, 'env'>;
};

export async function createApp(options: CreateAppOptions) {
  const app = Fastify({ logger: false });

  app.get('/api/v1/health', async () => ({
    status: 'ok',
    tradingMode: options.env.TRADING_MODE,
    liveTradingEnabled: options.env.LIVE_TRADING_ENABLED,
  }));

  if (options.sandboxAdmin !== undefined) {
    await registerSandboxAdminRoutes(app, {
      env: options.env,
      ...options.sandboxAdmin,
    });
  }

  return app;
}
