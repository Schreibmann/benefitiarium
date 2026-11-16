import { randomUUID } from 'node:crypto';
import type { CanonicalStreamCandle } from '@moex/broker-tinvest';
import type { MarketDataProvider } from '@moex/contracts';
import { parseInstrumentId, parseUuid } from '@moex/domain';
import type { MarketSignalsRepository } from '@moex/persistence';
import {
  buildApproachStateKey,
  createInMemoryTriggerStateStore,
  createTriggerRegistry,
  type EvalMode,
  type SignalTimeframe,
  type TriggerId,
  type TriggerRegistry,
  type TriggerStateStore,
} from '@moex/signal-triggers';
import { formatTelegramMessage } from './format-telegram-message.js';
import type { PivotLevelCache } from './pivot-level-cache.js';
import type { PreviousPriceStore } from './previous-price-store.js';

export type TriggerEvaluatorDeps = {
  marketData: MarketDataProvider;
  levelCache: PivotLevelCache;
  previousPrices: PreviousPriceStore;
  signalsRepo: MarketSignalsRepository;
  evalMode: EvalMode;
  triggers: readonly TriggerId[];
  approachPctByTimeframe: { '5m': string; '1h': string };
  telegramChannelId: string | null;
  telegramTopicAlerts?: number | null;
  timeZone: string;
  registry?: TriggerRegistry;
  state?: TriggerStateStore;
  createId?: () => string;
  onPersisted?: (count: number) => void;
  onSkipped?: (reason: string) => void;
};

function isSignalTimeframe(value: string): value is SignalTimeframe {
  return value === '5m' || value === '1h';
}

export function createTriggerEvaluator(deps: TriggerEvaluatorDeps) {
  const registry = deps.registry ?? createTriggerRegistry();
  const state = deps.state ?? createInMemoryTriggerStateStore();
  const createId = deps.createId ?? (() => randomUUID());

  async function seedPreviousPrice(
    instrumentUid: string,
    timeframe: SignalTimeframe,
  ): Promise<void> {
    if (deps.previousPrices.get(instrumentUid, timeframe) !== null) {
      return;
    }
    const to = new Date();
    const from = new Date(to.getTime() - 3 * 24 * 60 * 60 * 1000);
    const result = await deps.marketData.getCandles({
      instrumentId: parseInstrumentId(instrumentUid),
      interval: timeframe,
      from,
      to,
    });
    const closed = result.items.filter((candle) => candle.isClosed);
    const last = closed[closed.length - 1];
    if (last !== undefined) {
      deps.previousPrices.seed(instrumentUid, timeframe, last.close);
    }
  }

  async function hydrateApproachState(instrumentUid: string, periodId: string): Promise<void> {
    const rows = await deps.signalsRepo.listActiveApproachState({
      instrumentUids: [instrumentUid],
      periodIds: [periodId],
    });
    state.hydrateApproachKeys(
      rows.map((row) =>
        buildApproachStateKey({
          instrumentUid: row.instrumentUid,
          timeframe: row.timeframe,
          periodId: row.periodId,
          levelName: row.levelName,
          side: row.side,
        }),
      ),
    );
  }

  async function handleCandle(candle: CanonicalStreamCandle): Promise<void> {
    if (candle.barState === 'CORRECTED') {
      deps.onSkipped?.('corrected');
      return;
    }
    if (deps.evalMode === 'close' && candle.barState !== 'CLOSE_EMITTED') {
      deps.onSkipped?.('not_closed');
      return;
    }
    if (!isSignalTimeframe(candle.interval)) {
      deps.onSkipped?.('unsupported_interval');
      return;
    }

    await seedPreviousPrice(candle.instrumentUid, candle.interval);
    const previousPrice = deps.previousPrices.get(candle.instrumentUid, candle.interval);
    const levelSet = await deps.levelCache.getLevelSet({
      instrumentUid: candle.instrumentUid,
      timeframe: candle.interval,
    });
    if (levelSet === null) {
      deps.onSkipped?.('missing_levels');
      deps.previousPrices.set(candle.instrumentUid, candle.interval, candle.close);
      return;
    }
    if (levelSet.quality === 'DEGENERATE_RANGE') {
      deps.onSkipped?.('degenerate_range');
      deps.previousPrices.set(candle.instrumentUid, candle.interval, candle.close);
      return;
    }

    await hydrateApproachState(candle.instrumentUid, levelSet.periodId);

    const hits = registry.evaluate(
      deps.triggers,
      {
        instrumentUid: candle.instrumentUid,
        ticker: candle.ticker,
        timeframe: candle.interval,
        price: candle.close,
        previousPrice,
        evalMode: deps.evalMode,
        candleTimeStart: candle.timeStart,
        levelSet,
        approachPctByTimeframe: deps.approachPctByTimeframe,
      },
      state,
    );

    let persisted = 0;
    for (const hit of hits) {
      const text = formatTelegramMessage({
        hit,
        ticker: candle.ticker,
        timeframe: candle.interval,
        timeZone: deps.timeZone,
      });
      const channelId = deps.telegramChannelId;
      if (channelId === null) {
        deps.onSkipped?.('missing_telegram_channel');
        continue;
      }
      const result = await deps.signalsRepo.insertSignalWithNotification({
        signal: {
          id: parseUuid(createId()),
          triggerId: hit.triggerId,
          triggerVersion: hit.triggerVersion,
          instrumentUid: candle.instrumentUid,
          ticker: candle.ticker,
          timeframe: candle.interval,
          kind: hit.kind,
          levelName: hit.levelName,
          levelValue: hit.levelValue,
          side: hit.side,
          price: hit.price,
          previousPrice: hit.previousPrice,
          evalMode: deps.evalMode,
          periodId: hit.periodId,
          candleTime: hit.candleTimeStart,
          payload: {
            features: hit.features,
            reasons: hit.reasons,
            eventHash: candle.eventHash,
          },
          dedupeKey: hit.dedupeKey,
        },
        notification: {
          id: parseUuid(createId()),
          channel: 'telegram',
          target: channelId,
          text,
          threadId: deps.telegramTopicAlerts ?? null,
        },
      });
      if (result.inserted) {
        persisted += 1;
      }
    }

    deps.previousPrices.set(candle.instrumentUid, candle.interval, candle.close);
    if (persisted > 0) {
      deps.onPersisted?.(persisted);
    }
  }

  return { handleCandle, state };
}
