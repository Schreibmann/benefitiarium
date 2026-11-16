import type { TradeEvaluation, TradingPosition } from '../paper/types.js';
import type { TradingSetup } from '../strategies/types.js';
import type { EngineCandle, EngineMarketEvent } from '../types.js';
import type { SignalLifecycleEvent, TradingSignalRecord } from './lifecycle.js';
import type { PartitionKey } from './partition.js';

export type ProcessedMarketEventRecord = {
  eventId: string;
  partitionKey: PartitionKey;
  kind: EngineMarketEvent['kind'];
  candleTimestamp: number;
  revision: number;
  processedAt: number;
  status: 'processed' | 'quarantined' | 'replay_scheduled';
};

export type PartitionAnalysisState = {
  partitionKey: PartitionKey;
  latestConfirmedCandleTimestamp: number | null;
  latestEventTimestamp: number | null;
  latestAcceptedOrderKey: string | null;
  candlesByTimestamp: Map<number, EngineCandle>;
  setupsById: Map<string, TradingSetup>;
  /** Active/open-lifecycle signals keyed by deduplicationKey. */
  signalsByDedupKey: Map<string, TradingSignalRecord>;
  positionsById: Map<string, TradingPosition>;
  evaluationsByPositionId: Map<string, TradeEvaluation>;
  pendingReplayFrom: number | null;
  algorithmVersion: string;
  configVersion: string;
};

export type EngineOutboxRecord = {
  id: string;
  aggregateType: 'trading_signal' | 'market_event' | 'partition_state' | 'paper_position';
  aggregateId: string;
  eventType: string;
  payload: SignalLifecycleEvent | Readonly<Record<string, string | number | boolean | null>>;
  createdAt: number;
  publishedAt: number | null;
};

export type PartitionTransactionWrites = {
  state: PartitionAnalysisState;
  signals: readonly TradingSignalRecord[];
  positions: readonly TradingPosition[];
  evaluations: readonly TradeEvaluation[];
  outbox: readonly EngineOutboxRecord[];
  processed: ProcessedMarketEventRecord;
};

export type LivePersistencePorts = {
  isProcessed: (partitionKey: PartitionKey, eventId: string) => Promise<boolean>;
  loadState: (partitionKey: PartitionKey) => Promise<PartitionAnalysisState | null>;
  /**
   * Atomically persist partition state, signal/position upserts, outbox rows, and
   * processed-event mark. On failure nothing from the batch is visible.
   */
  commit: (writes: PartitionTransactionWrites) => Promise<void>;
  listOutbox: (limit?: number) => Promise<EngineOutboxRecord[]>;
  listSignals: (partitionKey: PartitionKey) => Promise<TradingSignalRecord[]>;
  listPositions: (partitionKey: PartitionKey) => Promise<TradingPosition[]>;
};

function clonePosition(position: TradingPosition): TradingPosition {
  return {
    ...position,
    targets: [...position.targets],
    reachedTargets: [...position.reachedTargets],
  };
}

function cloneEvaluation(evaluation: TradeEvaluation): TradeEvaluation {
  return {
    ...evaluation,
    reachedTargetIds: [...evaluation.reachedTargetIds],
    qualityFlags: [...evaluation.qualityFlags],
  };
}

export function createEmptyPartitionState(input: {
  partitionKey: PartitionKey;
  algorithmVersion: string;
  configVersion: string;
}): PartitionAnalysisState {
  return {
    partitionKey: input.partitionKey,
    latestConfirmedCandleTimestamp: null,
    latestEventTimestamp: null,
    latestAcceptedOrderKey: null,
    candlesByTimestamp: new Map(),
    setupsById: new Map(),
    signalsByDedupKey: new Map(),
    positionsById: new Map(),
    evaluationsByPositionId: new Map(),
    pendingReplayFrom: null,
    algorithmVersion: input.algorithmVersion,
    configVersion: input.configVersion,
  };
}

export function clonePartitionState(state: PartitionAnalysisState): PartitionAnalysisState {
  return {
    partitionKey: state.partitionKey,
    latestConfirmedCandleTimestamp: state.latestConfirmedCandleTimestamp,
    latestEventTimestamp: state.latestEventTimestamp,
    latestAcceptedOrderKey: state.latestAcceptedOrderKey,
    candlesByTimestamp: new Map(state.candlesByTimestamp),
    setupsById: new Map(state.setupsById),
    signalsByDedupKey: new Map(state.signalsByDedupKey),
    positionsById: new Map(
      [...state.positionsById.entries()].map(([key, value]) => [key, clonePosition(value)]),
    ),
    evaluationsByPositionId: new Map(
      [...state.evaluationsByPositionId.entries()].map(([key, value]) => [
        key,
        cloneEvaluation(value),
      ]),
    ),
    pendingReplayFrom: state.pendingReplayFrom,
    algorithmVersion: state.algorithmVersion,
    configVersion: state.configVersion,
  };
}

export type MemoryLiveStore = LivePersistencePorts & {
  /** Test helper: force-fail next commit after staging writes. */
  setFailNextCommit: (fail: boolean) => void;
  snapshotProcessed: () => ProcessedMarketEventRecord[];
  snapshotOutbox: () => EngineOutboxRecord[];
};

/**
 * In-memory transactional store for unit tests and local dry-runs.
 * Models same-transaction state + signals + positions + outbox + processedEvents.
 */
export function createMemoryLiveStore(): MemoryLiveStore {
  const processed = new Map<string, ProcessedMarketEventRecord>();
  const states = new Map<PartitionKey, PartitionAnalysisState>();
  const signals = new Map<string, TradingSignalRecord>();
  const positions = new Map<string, TradingPosition>();
  const evaluations = new Map<string, TradeEvaluation>();
  const outbox = new Map<string, EngineOutboxRecord>();
  let failNextCommit = false;

  const processedKey = (partition: PartitionKey, eventId: string) => `${partition}|${eventId}`;

  return {
    setFailNextCommit: (fail) => {
      failNextCommit = fail;
    },
    snapshotProcessed: () => [...processed.values()].map((row) => ({ ...row })),
    snapshotOutbox: () =>
      [...outbox.values()].map((row) => ({
        ...row,
        payload: { ...row.payload },
      })),

    isProcessed: async (partition, eventId) => processed.has(processedKey(partition, eventId)),

    loadState: async (partition) => {
      const state = states.get(partition);
      return state === undefined ? null : clonePartitionState(state);
    },

    listOutbox: async (limit = 100) =>
      [...outbox.values()]
        .filter((row) => row.publishedAt === null)
        .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
        .slice(0, limit)
        .map((row) => ({ ...row, payload: { ...row.payload } })),

    listSignals: async (partition) =>
      [...signals.values()]
        .filter((signal) => `${signal.instrumentId}|${signal.timeframe}` === partition)
        .map((signal) => ({ ...signal, reasonCodes: [...signal.reasonCodes] })),

    listPositions: async (partition) =>
      [...positions.values()]
        .filter((position) => `${position.instrumentId}|${position.timeframe}` === partition)
        .map((position) => clonePosition(position)),

    commit: async (writes) => {
      const processedBefore = new Map(processed);
      const statesBefore = new Map(
        [...states.entries()].map(([key, value]) => [key, clonePartitionState(value)]),
      );
      const signalsBefore = new Map(
        [...signals.entries()].map(([key, value]) => [
          key,
          { ...value, reasonCodes: [...value.reasonCodes] },
        ]),
      );
      const positionsBefore = new Map(
        [...positions.entries()].map(([key, value]) => [key, clonePosition(value)]),
      );
      const evaluationsBefore = new Map(
        [...evaluations.entries()].map(([key, value]) => [key, cloneEvaluation(value)]),
      );
      const outboxBefore = new Map(
        [...outbox.entries()].map(([key, value]) => [
          key,
          { ...value, payload: { ...value.payload } },
        ]),
      );

      try {
        states.set(writes.state.partitionKey, clonePartitionState(writes.state));

        for (const signal of writes.signals) {
          signals.set(signal.signalId, {
            ...signal,
            reasonCodes: [...signal.reasonCodes],
          });
        }

        for (const position of writes.positions) {
          positions.set(position.id, clonePosition(position));
        }

        for (const evaluation of writes.evaluations) {
          evaluations.set(evaluation.positionId, cloneEvaluation(evaluation));
        }

        for (const row of writes.outbox) {
          if (outbox.has(row.id)) {
            throw new Error(`Duplicate outbox eventId: ${row.id}`);
          }
          outbox.set(row.id, { ...row, payload: { ...row.payload } });
        }

        const key = processedKey(writes.processed.partitionKey, writes.processed.eventId);
        if (processed.has(key)) {
          throw new Error(`Duplicate processed event: ${key}`);
        }
        processed.set(key, { ...writes.processed });

        if (failNextCommit) {
          failNextCommit = false;
          throw new Error('simulated live store commit failure');
        }
      } catch (error: unknown) {
        processed.clear();
        for (const [key, value] of processedBefore) {
          processed.set(key, value);
        }
        states.clear();
        for (const [key, value] of statesBefore) {
          states.set(key, value);
        }
        signals.clear();
        for (const [key, value] of signalsBefore) {
          signals.set(key, value);
        }
        positions.clear();
        for (const [key, value] of positionsBefore) {
          positions.set(key, value);
        }
        evaluations.clear();
        for (const [key, value] of evaluationsBefore) {
          evaluations.set(key, value);
        }
        outbox.clear();
        for (const [key, value] of outboxBefore) {
          outbox.set(key, value);
        }
        throw error;
      }
    },
  };
}
