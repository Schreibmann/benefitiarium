import {
  createIdentityInstrumentUidResolver,
  createSdkTinvestReadApi,
  createTinvestMarketDataProvider,
  createTinvestSdk,
  createTinvestStreamClient,
  StreamConnectionManager,
  SubscriptionRegistry,
} from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import { resolveTinvestToken } from '@moex/config';
import {
  createFuturesCatalogCacheRepository,
  createPsqlDbClient,
  type DbClient,
  type FuturesCatalogCacheRepository,
} from '@moex/persistence';
import { type ChartLiveGateway, createChartLiveGateway } from './market/chart-live-gateway.js';
import type { ChartMarketDataDeps } from './market/fibonacci-pivot-service.js';

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

export type ComposedMarketData = {
  chartDeps: ChartMarketDataDeps;
  chartLive: ChartLiveGateway | null;
};

/**
 * Compose market-data deps for chart/pivot read routes and optional live stream gateway.
 * Prefers TINVEST_READ_ONLY_TOKEN; falls back to sandbox token for sandbox env.
 * When Postgres is reachable, attaches futures catalog cache for list fallback.
 *
 * Live stream runs in-process with the API for MVP (worker-market-data will host later).
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
  const marketData = createTinvestMarketDataProvider({
    api,
    resolver: createIdentityInstrumentUidResolver(),
    isSandbox: sdkEnv === 'sandbox',
  });
  const futuresCatalogCache = await tryCreateFuturesCatalogCache();
  const chartDeps: ChartMarketDataDeps = {
    marketData,
    ...(futuresCatalogCache !== undefined ? { futuresCatalogCache } : {}),
  };

  let chartLive: ChartLiveGateway | null = null;
  try {
    const streamClient = await createTinvestStreamClient({
      token,
      env: sdkEnv,
      baseUrl: env.TINVEST_BASE_URL,
    });
    const registry = new SubscriptionRegistry();
    // Gateway + manager are wired through shared mutable holder so callbacks close over gateway.
    const holder: { gateway: ChartLiveGateway | null } = { gateway: null };
    const streamManager = new StreamConnectionManager({
      client: streamClient,
      handlers: {
        onCandle: (candle) => {
          holder.gateway?.handleCandle(candle);
        },
        onSubscriptionAck: (acks) => {
          holder.gateway?.handleSubscriptionAcks(acks);
        },
      },
    });
    const gateway = createChartLiveGateway({ streamManager, registry });
    holder.gateway = gateway;
    chartLive = gateway;
  } catch {
    chartLive = null;
  }

  return { chartDeps, chartLive };
}
