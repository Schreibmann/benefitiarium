import {
  TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION,
  type TradingSignalEngineConfig,
} from '../config.js';
import type { SignalScore } from '../scoring/types.js';
import type { TradingSetup } from '../strategies/types.js';
import type { EngineMarketEvent, QuarantinedEvent, ValidationIssue } from '../types.js';
import { validateOhlcv } from '../validate.js';
import {
  type SignalLifecycleEvent,
  type TradingSignalRecord,
  updateSignalLifecycle,
} from './lifecycle.js';
import { isLateConfirmedEvent } from './ordering.js';
import { type PartitionKey, partitionKey } from './partition.js';
import {
  clonePartitionState,
  createEmptyPartitionState,
  type EngineOutboxRecord,
  type LivePersistencePorts,
  type PartitionAnalysisState,
} from './store.js';

export type LiveEvaluationDecision = {
  setups: readonly TradingSetup[];
  /** Lifecycle rows to apply for this event (candidate or confirmed). */
  signals: readonly {
    setupId: string;
    signalId: string;
    score: SignalScore | null;
    confirm: boolean;
    reasonCodes?: readonly string[];
    triggerCandleTimestamp: number;
  }[];
};

export type LiveProcessorHooks = {
  evaluateLive: (input: {
    event: EngineMarketEvent;
    state: PartitionAnalysisState;
  }) => LiveEvaluationDecision | Promise<LiveEvaluationDecision>;
  evaluateConfirmed: (input: {
    event: EngineMarketEvent;
    state: PartitionAnalysisState;
  }) => LiveEvaluationDecision | Promise<LiveEvaluationDecision>;
};

export type ProcessMarketEventResult =
  | { status: 'duplicate'; eventId: string; partitionKey: PartitionKey }
  | { status: 'quarantined'; quarantined: QuarantinedEvent; partitionKey: PartitionKey }
  | {
      status: 'processed';
      eventId: string;
      partitionKey: PartitionKey;
      mode: 'live' | 'confirmed' | 'correction';
      lifecycleEvents: SignalLifecycleEvent[];
      lateEvent: boolean;
      replayFrom: number | null;
    };

export type LiveSignalProcessor = {
  processMarketEvent: (event: EngineMarketEvent) => Promise<ProcessMarketEventResult>;
};

export type CreateLiveSignalProcessorInput = {
  store: LivePersistencePorts;
  hooks: LiveProcessorHooks;
  config: Pick<TradingSignalEngineConfig, 'configVersion'> & {
    algorithmVersion?: string;
  };
};

function createPartitionLock(): {
  run: <T>(key: PartitionKey, fn: () => Promise<T>) => Promise<T>;
} {
  const tails = new Map<PartitionKey, Promise<unknown>>();

  return {
    run: (key, fn) => {
      const previous = tails.get(key) ?? Promise.resolve();
      const runPromise = previous.catch(() => undefined).then(fn);
      tails.set(
        key,
        runPromise.then(
          () => undefined,
          () => undefined,
        ),
      );
      return runPromise;
    },
  };
}

function eventOrderKey(event: EngineMarketEvent): string {
  const sequence = event.sequence === undefined ? '' : String(event.sequence);
  return [
    sequence,
    String(event.eventTimestamp),
    String(event.candle.timestamp),
    String(event.candle.revision),
    event.eventId,
  ].join('|');
}

function applyCandleToState(state: PartitionAnalysisState, event: EngineMarketEvent): void {
  state.candlesByTimestamp.set(event.candle.timestamp, event.candle);
  state.latestEventTimestamp = event.eventTimestamp;
  state.latestAcceptedOrderKey = eventOrderKey(event);
  if (event.kind === 'CANDLE_CLOSED' || event.candle.status === 'CLOSED') {
    const previous = state.latestConfirmedCandleTimestamp;
    if (previous === null || event.candle.timestamp >= previous) {
      state.latestConfirmedCandleTimestamp = event.candle.timestamp;
    }
  }
}

function applySetups(state: PartitionAnalysisState, setups: readonly TradingSetup[]): void {
  for (const setup of setups) {
    state.setupsById.set(setup.id, setup);
  }
}

function toOutboxRecords(
  events: readonly SignalLifecycleEvent[],
  createdAt: number,
): EngineOutboxRecord[] {
  return events.map((event) => ({
    id: `${event.id}:${event.signalId}:${event.eventType}`,
    aggregateType: 'trading_signal' as const,
    aggregateId: event.signalId,
    eventType: event.eventType,
    payload: event,
    createdAt,
    publishedAt: null,
  }));
}

function applyLifecycleDecisions(input: {
  decision: LiveEvaluationDecision;
  state: PartitionAnalysisState;
  event: EngineMarketEvent;
  algorithmVersion: string;
  configVersion: string;
}): {
  signals: TradingSignalRecord[];
  lifecycleEvents: SignalLifecycleEvent[];
} {
  const signals: TradingSignalRecord[] = [];
  const lifecycleEvents: SignalLifecycleEvent[] = [];

  for (const item of input.decision.signals) {
    const setup = input.decision.setups.find((candidate) => candidate.id === item.setupId);
    if (setup === undefined) {
      throw new Error(`Setup not found for lifecycle update: ${item.setupId}`);
    }

    const existing =
      [...input.state.signalsByDedupKey.values()].find((signal) => signal.setupId === setup.id) ??
      null;

    const lifecycleEventId = `${input.event.eventId}:${item.signalId}`;
    const lifecycleInput = {
      setup,
      existing,
      signalId: item.signalId,
      eventId: lifecycleEventId,
      timestamp: input.event.eventTimestamp,
      triggerCandleTimestamp: item.triggerCandleTimestamp,
      algorithmVersion: input.algorithmVersion,
      configVersion: input.configVersion,
      score: item.score,
      confirm: item.confirm,
      ...(item.reasonCodes === undefined ? {} : { reasonCodes: item.reasonCodes }),
    };
    const result = updateSignalLifecycle(lifecycleInput);

    input.state.signalsByDedupKey.set(result.signal.deduplicationKey, result.signal);
    signals.push(result.signal);
    lifecycleEvents.push(...result.events);
  }

  return { signals, lifecycleEvents };
}

function revisionIssues(
  state: PartitionAnalysisState,
  event: EngineMarketEvent,
): ValidationIssue[] {
  const previous = state.candlesByTimestamp.get(event.candle.timestamp);
  if (previous === undefined) {
    return [];
  }
  if (event.candle.revision < previous.revision) {
    return [
      {
        reasonCode: 'DATA_REVISION_NON_MONOTONIC',
        message: `revision ${event.candle.revision} is less than previous ${previous.revision}`,
        path: 'candle.revision',
      },
    ];
  }
  if (event.candle.revision === previous.revision) {
    return [
      {
        reasonCode: 'DATA_DUPLICATE_EVENT',
        message: `revision ${event.candle.revision} already applied for candle ${event.candle.timestamp}`,
        path: 'candle.revision',
      },
    ];
  }
  return [];
}

/**
 * Live/confirmed market-event processor with per-partition locking,
 * processed-event idempotency, and transactional outbox commits.
 */
export function createLiveSignalProcessor(
  input: CreateLiveSignalProcessorInput,
): LiveSignalProcessor {
  const lock = createPartitionLock();
  const algorithmVersion = input.config.algorithmVersion ?? TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION;
  const configVersion = input.config.configVersion;

  return {
    processMarketEvent: async (event) => {
      const key = partitionKey(event.candle.instrumentId, event.candle.timeframe);

      return lock.run(key, async () => {
        if (await input.store.isProcessed(key, event.eventId)) {
          return { status: 'duplicate', eventId: event.eventId, partitionKey: key };
        }

        const loaded = await input.store.loadState(key);
        const state =
          loaded === null
            ? createEmptyPartitionState({
                partitionKey: key,
                algorithmVersion,
                configVersion,
              })
            : clonePartitionState(loaded);

        const ohlcv = validateOhlcv(event.candle);
        const revision = revisionIssues(state, event);
        const issues = ohlcv.ok ? revision : [...ohlcv.issues, ...revision];

        if (issues.length > 0) {
          const quarantined: QuarantinedEvent = {
            event,
            issues,
            quarantinedAt: event.receivedAt,
          };
          await input.store.commit({
            state,
            signals: [],
            outbox: [],
            processed: {
              eventId: event.eventId,
              partitionKey: key,
              kind: event.kind,
              candleTimestamp: event.candle.timestamp,
              revision: event.candle.revision,
              processedAt: event.receivedAt,
              status: 'quarantined',
            },
          });
          return { status: 'quarantined', quarantined, partitionKey: key };
        }

        const lateEvent = isLateConfirmedEvent(event, state.latestConfirmedCandleTimestamp);
        applyCandleToState(state, event);

        if (event.kind === 'CANDLE_CORRECTED' || event.candle.status === 'CORRECTED') {
          state.pendingReplayFrom = event.candle.timestamp;
          await input.store.commit({
            state,
            signals: [],
            outbox: [
              {
                id: `${event.eventId}:correction`,
                aggregateType: 'market_event',
                aggregateId: key,
                eventType: 'CANDLE_CORRECTION_REPLAY',
                payload: {
                  eventId: event.eventId,
                  candleTimestamp: event.candle.timestamp,
                  revision: event.candle.revision,
                },
                createdAt: event.eventTimestamp,
                publishedAt: null,
              },
            ],
            processed: {
              eventId: event.eventId,
              partitionKey: key,
              kind: event.kind,
              candleTimestamp: event.candle.timestamp,
              revision: event.candle.revision,
              processedAt: event.receivedAt,
              status: 'replay_scheduled',
            },
          });

          return {
            status: 'processed',
            eventId: event.eventId,
            partitionKey: key,
            mode: 'correction',
            lifecycleEvents: [],
            lateEvent,
            replayFrom: event.candle.timestamp,
          };
        }

        const isLive =
          event.kind === 'CANDLE_UPDATE' ||
          event.candle.status === 'OPEN' ||
          (event.kind !== 'CANDLE_CLOSED' && event.candle.status !== 'CLOSED');

        const decision = isLive
          ? await input.hooks.evaluateLive({ event, state })
          : await input.hooks.evaluateConfirmed({ event, state });

        applySetups(state, decision.setups);

        const { signals, lifecycleEvents } = applyLifecycleDecisions({
          decision,
          state,
          event,
          algorithmVersion,
          configVersion,
        });

        if (lateEvent) {
          state.pendingReplayFrom =
            state.pendingReplayFrom === null
              ? event.candle.timestamp
              : Math.min(state.pendingReplayFrom, event.candle.timestamp);
        }

        await input.store.commit({
          state,
          signals,
          outbox: toOutboxRecords(lifecycleEvents, event.eventTimestamp),
          processed: {
            eventId: event.eventId,
            partitionKey: key,
            kind: event.kind,
            candleTimestamp: event.candle.timestamp,
            revision: event.candle.revision,
            processedAt: event.receivedAt,
            status: 'processed',
          },
        });

        return {
          status: 'processed',
          eventId: event.eventId,
          partitionKey: key,
          mode: isLive ? 'live' : 'confirmed',
          lifecycleEvents,
          lateEvent,
          replayFrom: state.pendingReplayFrom,
        };
      });
    },
  };
}
