import type { FavoritesRepository } from '@moex/persistence';
import type { FastifyInstance } from 'fastify';
import type { LiveRuntime } from './live-runtime.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function registerLiveRoutes(
  app: FastifyInstance,
  deps: {
    liveRuntime: LiveRuntime;
    favorites: FavoritesRepository;
  },
): Promise<void> {
  app.get('/api/v1/live', async () => deps.liveRuntime.getSnapshot());

  app.post('/api/v1/live/start', async () => deps.liveRuntime.start());

  app.post('/api/v1/live/stop', async () => deps.liveRuntime.stop());

  app.get('/api/v1/favorites', async () => {
    const items = await deps.favorites.list();
    return { items };
  });

  app.post('/api/v1/favorites', async (request, reply) => {
    if (!isRecord(request.body)) {
      return reply.code(400).send({ error: 'body must be an object' });
    }
    const instrumentUid = request.body.instrumentUid;
    const ticker = request.body.ticker;
    const figi = request.body.figi;
    if (typeof instrumentUid !== 'string' || instrumentUid.trim().length === 0) {
      return reply.code(400).send({ error: 'instrumentUid is required' });
    }
    if (typeof ticker !== 'string' || ticker.trim().length === 0) {
      return reply.code(400).send({ error: 'ticker is required' });
    }
    const row = await deps.favorites.upsert({
      instrumentUid: instrumentUid.trim(),
      ticker: ticker.trim(),
      figi: typeof figi === 'string' ? figi : null,
    });
    await deps.liveRuntime.resyncFavorites();
    return reply.code(201).send(row);
  });

  app.delete('/api/v1/favorites/:instrumentUid', async (request, reply) => {
    const params = request.params;
    if (!isRecord(params) || typeof params.instrumentUid !== 'string') {
      return reply.code(400).send({ error: 'instrumentUid is required' });
    }
    const removed = await deps.favorites.remove(params.instrumentUid);
    if (!removed) {
      return reply.code(404).send({ error: 'favorite not found' });
    }
    await deps.liveRuntime.resyncFavorites();
    return reply.code(204).send();
  });
}
