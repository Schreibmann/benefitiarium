import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { TradingSetup } from '../strategies/types.js';
import type { EngineCandle, EngineInstrumentSpec, EngineMarketEvent } from '../types.js';
import { createLiveSignalProcessor, type LiveProcessorHooks } from './processor.js';
import { createMemoryLiveStore } from './store.js';

const instrumentId = parseInstrumentId('16161616-1616-4161-8161-161616161616');

function candle(
  overrides: Partial<EngineCandle> & Pick<EngineCandle, 'timestamp' | 'revision' | 'status'>,
): EngineCandle {
  return {
    instrumentId,
    timeframe: '5m',
    closeTimestamp: overrides.timestamp + 300_000,
    open: parseDecimalString('100'),
    high: parseDecimalString('101'),
    low: parseDecimalString('99'),
    close: parseDecimalString('100.5'),
    volume: parseDecimalString('10'),
    sourceEventId: 'src',
    ...overrides,
  };
}

function event(
  overrides: Partial<EngineMarketEvent> & Pick<EngineMarketEvent, 'eventId' | 'candle' | 'kind'>,
): EngineMarketEvent {
  return {
    receivedAt: overrides.candle.timestamp,
    eventTimestamp: overrides.candle.timestamp,
    ...overrides,
  };
}

function approachingSetup(updatedAt: number): TradingSetup {
  return {
    id: 'setup-1',
    instrumentId,
    strategy: 'TREND_PULLBACK',
    direction: 'LONG',
    setupTimeframe: '5m',
    createdAt: 1,
    updatedAt,
    status: 'APPROACHING',
    zoneId: 'z1',
    triggerLevel: parseDecimalString('100'),
    invalidationLevel: parseDecimalString('95'),
    referencePrice: parseDecimalString('100'),
    referenceSwingIds: [],
    referenceProfileIds: [],
    referencePivotSetIds: [],
    reasonCodes: ['SETUP_ZONE_APPROACHED'],
    expiresAt: null,
  };
}

function triggeredSetup(updatedAt: number): TradingSetup {
  return { ...approachingSetup(updatedAt), status: 'TRIGGERED' };
}

function hooks(options?: { confirmOnClosed?: boolean }): LiveProcessorHooks {
  return {
    evaluateLive: ({ event: marketEvent }) => {
      const setup = approachingSetup(marketEvent.eventTimestamp);
      return {
        setups: [setup],
        signals: [
          {
            setupId: setup.id,
            signalId: 'sig-1',
            score: null,
            confirm: false,
            triggerCandleTimestamp: marketEvent.candle.timestamp,
          },
        ],
      };
    },
    evaluateConfirmed: ({ event: marketEvent }) => {
      const setup = triggeredSetup(marketEvent.eventTimestamp);
      return {
        setups: [setup],
        signals: [
          {
            setupId: setup.id,
            signalId: 'sig-1',
            score: null,
            confirm: options?.confirmOnClosed ?? true,
            triggerCandleTimestamp: marketEvent.candle.timestamp,
          },
        ],
      };
    },
  };
}

describe('createLiveSignalProcessor', () => {
  it('is idempotent for the same eventId', async () => {
    const store = createMemoryLiveStore();
    const processor = createLiveSignalProcessor({
      store,
      hooks: hooks(),
      config: { configVersion: 'cfg-1' },
    });
    const marketEvent = event({
      eventId: 'e1',
      kind: 'CANDLE_UPDATE',
      candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
    });

    const first = await processor.processMarketEvent(marketEvent);
    const second = await processor.processMarketEvent(marketEvent);

    expect(first.status).toBe('processed');
    expect(second.status).toBe('duplicate');
    expect(store.snapshotOutbox()).toHaveLength(1);
  });

  it('emits live candidate updates without confirming on open candles', async () => {
    const store = createMemoryLiveStore();
    const processor = createLiveSignalProcessor({
      store,
      hooks: hooks(),
      config: { configVersion: 'cfg-1' },
    });

    const result = await processor.processMarketEvent(
      event({
        eventId: 'live-1',
        kind: 'CANDLE_UPDATE',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
      }),
    );

    expect(result.status).toBe('processed');
    if (result.status !== 'processed') {
      return;
    }
    expect(result.mode).toBe('live');
    expect(result.lifecycleEvents[0]?.status).toBe('APPROACHING');
    const signals = await store.listSignals(`${instrumentId}|5m`);
    expect(signals[0]?.status).toBe('APPROACHING');
  });

  it('confirms once on closed candle and does not duplicate outbox on replayed id', async () => {
    const store = createMemoryLiveStore();
    const processor = createLiveSignalProcessor({
      store,
      hooks: hooks({ confirmOnClosed: true }),
      config: { configVersion: 'cfg-1' },
    });

    await processor.processMarketEvent(
      event({
        eventId: 'live-1',
        kind: 'CANDLE_UPDATE',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
      }),
    );

    const closed = await processor.processMarketEvent(
      event({
        eventId: 'close-1',
        kind: 'CANDLE_CLOSED',
        candle: candle({ timestamp: 1_000, revision: 2, status: 'CLOSED' }),
      }),
    );

    expect(closed.status).toBe('processed');
    if (closed.status === 'processed') {
      expect(closed.mode).toBe('confirmed');
      expect(closed.lifecycleEvents.some((item) => item.eventType === 'SIGNAL_CONFIRMED')).toBe(
        true,
      );
    }

    const again = await processor.processMarketEvent(
      event({
        eventId: 'close-1',
        kind: 'CANDLE_CLOSED',
        candle: candle({ timestamp: 1_000, revision: 2, status: 'CLOSED' }),
      }),
    );
    expect(again.status).toBe('duplicate');

    const confirmedEvents = store
      .snapshotOutbox()
      .filter((row) => row.eventType === 'SIGNAL_CONFIRMED');
    expect(confirmedEvents).toHaveLength(1);
  });

  it('rolls back state, outbox, and processed mark together on commit failure', async () => {
    const store = createMemoryLiveStore();
    const processor = createLiveSignalProcessor({
      store,
      hooks: hooks(),
      config: { configVersion: 'cfg-1' },
    });
    store.setFailNextCommit(true);

    await expect(
      processor.processMarketEvent(
        event({
          eventId: 'fail-1',
          kind: 'CANDLE_UPDATE',
          candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
        }),
      ),
    ).rejects.toThrow(/simulated live store commit failure/);

    expect(store.snapshotOutbox()).toHaveLength(0);
    expect(store.snapshotProcessed()).toHaveLength(0);
    expect(await store.loadState(`${instrumentId}|5m`)).toBeNull();

    const recovered = await processor.processMarketEvent(
      event({
        eventId: 'fail-1',
        kind: 'CANDLE_UPDATE',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
      }),
    );
    expect(recovered.status).toBe('processed');
    expect(store.snapshotOutbox()).toHaveLength(1);
  });

  it('schedules correction replay without emitting confirmed lifecycle events', async () => {
    const store = createMemoryLiveStore();
    const processor = createLiveSignalProcessor({
      store,
      hooks: hooks(),
      config: { configVersion: 'cfg-1' },
    });

    await processor.processMarketEvent(
      event({
        eventId: 'close-1',
        kind: 'CANDLE_CLOSED',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'CLOSED' }),
      }),
    );

    const correction = await processor.processMarketEvent(
      event({
        eventId: 'corr-1',
        kind: 'CANDLE_CORRECTED',
        candle: candle({ timestamp: 1_000, revision: 2, status: 'CORRECTED' }),
      }),
    );

    expect(correction.status).toBe('processed');
    if (correction.status === 'processed') {
      expect(correction.mode).toBe('correction');
      expect(correction.replayFrom).toBe(1_000);
      expect(correction.lifecycleEvents).toHaveLength(0);
    }
    expect(store.snapshotOutbox().some((row) => row.eventType === 'CANDLE_CORRECTION_REPLAY')).toBe(
      true,
    );
  });

  it('opens and closes a paper position on confirmed bars when paperTrading is provided', async () => {
    const store = createMemoryLiveStore();
    const instrument: EngineInstrumentSpec = {
      instrumentId,
      exchange: 'MOEX',
      tickSize: parseDecimalString('0.01'),
      lotSize: 1,
      pointValue: parseDecimalString('1'),
      minQuantity: 1,
      quantityStep: 1,
      quoteCurrency: 'RUB',
      priceCurrency: 'RUB',
      tradingCalendarId: null,
      sessionProfile: 'SESSION_BASED',
    };

    const processor = createLiveSignalProcessor({
      store,
      hooks: {
        evaluateLive: hooks().evaluateLive,
        evaluateConfirmed: ({ event: marketEvent, state }) => {
          const open = [...state.positionsById.values()].some(
            (position) => position.status === 'OPEN' || position.status === 'PARTIALLY_CLOSED',
          );
          const setup = triggeredSetup(marketEvent.eventTimestamp);
          if (open) {
            return {
              setups: [],
              signals: [],
              paperTrading: {
                atr: '2',
                feePerUnit: '0',
                instrument,
              },
            };
          }
          return {
            setups: [setup],
            signals: [
              {
                setupId: setup.id,
                signalId: 'sig-1',
                score: null,
                confirm: true,
                triggerCandleTimestamp: 1_000,
              },
            ],
            paperTrading: {
              atr: '2',
              feePerUnit: '0',
              instrument,
              entriesToOpen: [
                {
                  positionId: 'pos-1',
                  signalId: 'sig-1',
                  instrumentId,
                  timeframe: setup.setupTimeframe,
                  strategy: setup.strategy,
                  direction: setup.direction,
                  timestamp: marketEvent.eventTimestamp,
                  referencePrice: '100',
                  tickSize: '0.01',
                  stop: '95',
                  targets: ['110'],
                  quantity: 2,
                  pointValue: '1',
                  feePerUnit: '0',
                  algorithmVersion: '1.0.0',
                  configVersion: 'cfg-1',
                  fillConfig: { halfSpreadTicks: 0, slippageTicks: 0 },
                },
              ],
            },
          };
        },
      },
      config: { configVersion: 'cfg-1' },
    });

    const opened = await processor.processMarketEvent(
      event({
        eventId: 'close-open',
        kind: 'CANDLE_CLOSED',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'CLOSED' }),
      }),
    );
    expect(opened.status).toBe('processed');
    if (opened.status === 'processed') {
      expect(opened.positionEvents.some((item) => item.eventType === 'POSITION_OPENED')).toBe(true);
    }

    const closed = await processor.processMarketEvent(
      event({
        eventId: 'close-stop',
        kind: 'CANDLE_CLOSED',
        candle: candle({
          timestamp: 2_000,
          revision: 1,
          status: 'CLOSED',
          low: parseDecimalString('94'),
          high: parseDecimalString('100'),
          close: parseDecimalString('95'),
        }),
      }),
    );
    expect(closed.status).toBe('processed');
    if (closed.status === 'processed') {
      expect(closed.positionEvents.some((item) => item.eventType === 'POSITION_CLOSED')).toBe(true);
      expect(closed.evaluations).toHaveLength(1);
    }
    expect(await store.listPositions(`${instrumentId}|5m`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'CLOSED' })]),
    );
  });

  it('restores partition continuity after a new processor attaches to the same store', async () => {
    const store = createMemoryLiveStore();
    const first = createLiveSignalProcessor({
      store,
      hooks: hooks(),
      config: { configVersion: 'cfg-1' },
    });

    await first.processMarketEvent(
      event({
        eventId: 'e1',
        kind: 'CANDLE_UPDATE',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
      }),
    );

    const second = createLiveSignalProcessor({
      store,
      hooks: hooks(),
      config: { configVersion: 'cfg-1' },
    });

    const duplicate = await second.processMarketEvent(
      event({
        eventId: 'e1',
        kind: 'CANDLE_UPDATE',
        candle: candle({ timestamp: 1_000, revision: 1, status: 'OPEN' }),
      }),
    );
    expect(duplicate.status).toBe('duplicate');

    const next = await second.processMarketEvent(
      event({
        eventId: 'e2',
        kind: 'CANDLE_UPDATE',
        candle: candle({ timestamp: 1_000, revision: 2, status: 'OPEN' }),
      }),
    );
    expect(next.status).toBe('processed');
    // Status unchanged → no additional lifecycle outbox row.
    expect(store.snapshotOutbox()).toHaveLength(1);
  });
});
