import type { MarketDataProvider } from '@moex/contracts';
import type { FavoritesRepository } from '@moex/persistence';
import type { FastifyInstance } from 'fastify';
import { withFavoritesDayChange } from './favorites-day-change.js';
import type { LiveRuntime } from './live-runtime.js';

export async function registerLiveRoutes(
  app: FastifyInstance,
  deps: {
    liveRuntime: LiveRuntime;
    favorites: FavoritesRepository;
    marketData?: MarketDataProvider;
  },
): Promise<void> {
  async function listFavoritesPayload() {
    const items = await deps.favorites.list();
    if (deps.marketData === undefined) {
      return {
        items: items.map((item) => ({ ...item, lastPrice: null, dayChangePct: null })),
        source: 'tinvest' as const,
      };
    }
    return {
      items: await withFavoritesDayChange(items, deps.marketData),
      source: 'tinvest' as const,
    };
  }

  app.get('/api/v1/live', async () => deps.liveRuntime.getSnapshot());

  app.post('/api/v1/live/start', async () => deps.liveRuntime.start());

  app.post('/api/v1/live/stop', async () => deps.liveRuntime.stop());

  app.get('/api/v1/favorites', async () => listFavoritesPayload());

  /** Re-pull broker favorites and refresh STRATEGY leases while Live is running. */
  app.post('/api/v1/favorites/sync', async () => {
    await deps.liveRuntime.resyncFavorites();
    return listFavoritesPayload();
  });

  app.post('/api/v1/favorites', async (_request, reply) =>
    reply.code(405).send({
      error:
        'Favorites are read from T-Invest GetFavorites. Add/remove instruments in the broker app, then POST /api/v1/favorites/sync.',
    }),
  );

  app.delete('/api/v1/favorites/:instrumentUid', async (_request, reply) =>
    reply.code(405).send({
      error:
        'Favorites are read from T-Invest GetFavorites. Add/remove instruments in the broker app, then POST /api/v1/favorites/sync.',
    }),
  );
}
