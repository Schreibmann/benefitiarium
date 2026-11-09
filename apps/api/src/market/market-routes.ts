import type { CandleInterval } from '@moex/domain';
import type { FastifyInstance } from 'fastify';
import {
  type ChartMarketDataDeps,
  getChartCandles,
  getFibonacciPivots,
  lookupInstrumentByTicker,
  parseChartTimeframe,
} from './fibonacci-pivot-service.js';
import { listFuturesCatalog } from './list-futures-by-category.js';

function isResourceExhaustedMessage(message: string): boolean {
  return message.includes('RESOURCE_EXHAUSTED');
}

function parseRequiredDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid ISO-8601 timestamp`);
  }
  return date;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function registerMarketRoutes(
  app: FastifyInstance,
  deps: ChartMarketDataDeps,
): Promise<void> {
  app.get('/api/v1/instruments/futures', async (_request, reply) => {
    try {
      return await listFuturesCatalog(deps);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'futures list request failed';
      if (isResourceExhaustedMessage(message)) {
        return reply.code(429).send({
          error:
            'T-Invest InstrumentsService/Futures rate limit (RESOURCE_EXHAUSTED). Retry in a few minutes; catalog is cached for 15m after a successful fetch.',
        });
      }
      return reply.code(400).send({ error: message });
    }
  });

  app.get('/api/v1/instruments/by-ticker/:ticker', async (request, reply) => {
    const params = request.params;
    if (typeof params !== 'object' || params === null || !('ticker' in params)) {
      return reply.code(400).send({ error: 'ticker is required' });
    }
    const ticker = String(params.ticker);
    const instrument = await lookupInstrumentByTicker(deps, ticker);
    if (instrument === null) {
      return reply.code(404).send({ error: 'instrument not found' });
    }
    return {
      instrumentUid: instrument.providerInstrumentId,
      ticker: instrument.ticker,
      name: instrument.name,
      assetType: instrument.assetType,
      classCode: instrument.classCode,
      currency: instrument.currency,
      isActive: instrument.isActive,
    };
  });

  app.get('/api/v1/instruments/:instrumentUid/candles', async (request, reply) => {
    try {
      const params = request.params;
      const query = request.query;
      if (typeof params !== 'object' || params === null || !('instrumentUid' in params)) {
        return reply.code(400).send({ error: 'instrumentUid is required' });
      }
      if (typeof query !== 'object' || query === null) {
        return reply.code(400).send({ error: 'query is required' });
      }
      const instrumentUid = String(params.instrumentUid);
      if (!isUuid(instrumentUid)) {
        return reply.code(400).send({ error: 'instrumentUid must be a UUID' });
      }
      const intervalRaw =
        'interval' in query && typeof query.interval === 'string' ? query.interval : '';
      if (intervalRaw !== '5m' && intervalRaw !== '1h') {
        return reply.code(400).send({ error: 'interval must be 5m or 1h' });
      }
      const from = parseRequiredDate('from' in query ? query.from : undefined, 'from');
      const to = parseRequiredDate('to' in query ? query.to : undefined, 'to');
      if (!(from < to)) {
        return reply.code(400).send({ error: 'from must be less than to' });
      }
      const items = await getChartCandles(deps, {
        instrumentUid,
        interval: intervalRaw,
        from,
        to,
      });
      return {
        instrumentUid,
        interval: intervalRaw satisfies CandleInterval,
        from: from.toISOString(),
        to: to.toISOString(),
        items: items.map((candle) => ({
          timeStart: candle.timeStart,
          timeEnd: candle.timeEnd,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          isClosed: candle.isClosed,
        })),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'candle request failed';
      return reply.code(400).send({ error: message });
    }
  });

  app.get(
    '/api/v1/instruments/:instrumentUid/indicators/fibonacci-pivots',
    async (request, reply) => {
      try {
        const params = request.params;
        const query = request.query;
        if (typeof params !== 'object' || params === null || !('instrumentUid' in params)) {
          return reply.code(400).send({ error: 'instrumentUid is required' });
        }
        if (typeof query !== 'object' || query === null) {
          return reply.code(400).send({ error: 'query is required' });
        }
        const instrumentUid = String(params.instrumentUid);
        if (!isUuid(instrumentUid)) {
          return reply.code(400).send({ error: 'instrumentUid must be a UUID' });
        }
        const timeframeRaw =
          'timeframe' in query && typeof query.timeframe === 'string' ? query.timeframe : '';
        const chartTimeframe = parseChartTimeframe(timeframeRaw);
        const from = parseRequiredDate('from' in query ? query.from : undefined, 'from');
        const to = parseRequiredDate('to' in query ? query.to : undefined, 'to');
        if (!(from < to)) {
          return reply.code(400).send({ error: 'from must be less than to' });
        }
        return await getFibonacciPivots(deps, {
          instrumentUid,
          chartTimeframe,
          from,
          to,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'pivot request failed';
        return reply.code(400).send({ error: message });
      }
    },
  );
}
