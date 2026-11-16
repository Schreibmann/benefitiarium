import type { CandleInterval, InstrumentId } from '@moex/domain';
import type { SignalScore } from '../scoring/types.js';
import type { SetupStatus, TradingSetup } from '../strategies/types.js';
import type { EngineDirection, StrategyId } from '../types.js';
import { buildSignalDeduplicationKey } from './dedup.js';

export type SignalStatus =
  | 'APPROACHING'
  | 'FORMING'
  | 'CANDIDATE'
  | 'CONFIRMED'
  | 'EXECUTED'
  | 'EXPIRED'
  | 'INVALIDATED'
  | 'CANCELLED';

export type SignalEventType =
  | 'SETUP_APPROACHING'
  | 'SETUP_FORMING'
  | 'SIGNAL_CANDIDATE'
  | 'SIGNAL_CONFIRMED'
  | 'SIGNAL_INVALIDATED'
  | 'SIGNAL_EXPIRED'
  | 'SIGNAL_CANCELLED'
  | 'POSITION_OPENED'
  | 'POSITION_UPDATED'
  | 'POSITION_EXIT_WARNING'
  | 'POSITION_CLOSED';

export type TradingSignalRecord = {
  signalId: string;
  setupId: string;
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
  strategy: StrategyId;
  direction: EngineDirection;
  status: SignalStatus;
  createdAt: number;
  updatedAt: number;
  score: SignalScore | null;
  reasonCodes: string[];
  deduplicationKey: string;
  algorithmVersion: string;
  configVersion: string;
  triggerCandleTimestamp: number;
};

export type SignalLifecycleEvent = {
  id: string;
  signalId: string;
  eventType: SignalEventType;
  instrumentId: InstrumentId;
  timeframe: CandleInterval;
  strategy: StrategyId;
  direction: EngineDirection;
  timestamp: number;
  status: SignalStatus;
  score: SignalScore | null;
  payload: Readonly<Record<string, string | number | boolean | null>>;
  reasonCodes: string[];
  deduplicationKey: string;
  algorithmVersion: string;
  configVersion: string;
};

const ALLOWED_TRANSITIONS: Readonly<Record<SignalStatus, readonly SignalStatus[]>> = {
  APPROACHING: ['FORMING', 'INVALIDATED', 'EXPIRED', 'CANCELLED'],
  FORMING: ['CANDIDATE', 'INVALIDATED', 'EXPIRED', 'CANCELLED'],
  CANDIDATE: ['CONFIRMED', 'INVALIDATED', 'EXPIRED', 'CANCELLED'],
  CONFIRMED: ['EXECUTED', 'EXPIRED', 'CANCELLED', 'INVALIDATED'],
  EXECUTED: [],
  EXPIRED: [],
  INVALIDATED: [],
  CANCELLED: [],
};

export function canTransitionSignalStatus(from: SignalStatus, to: SignalStatus): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertSignalTransition(from: SignalStatus, to: SignalStatus): void {
  if (!canTransitionSignalStatus(from, to)) {
    throw new Error(`Forbidden signal transition: ${from} -> ${to}`);
  }
}

export function setupStatusToSignalStatus(status: SetupStatus): SignalStatus | null {
  switch (status) {
    case 'APPROACHING':
      return 'APPROACHING';
    case 'FORMING':
      return 'FORMING';
    case 'WATCHING':
      return 'APPROACHING';
    case 'TRIGGERED':
      return 'CANDIDATE';
    case 'INVALIDATED':
      return 'INVALIDATED';
    case 'EXPIRED':
      return 'EXPIRED';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function signalStatusToEventType(status: SignalStatus): SignalEventType {
  switch (status) {
    case 'APPROACHING':
      return 'SETUP_APPROACHING';
    case 'FORMING':
      return 'SETUP_FORMING';
    case 'CANDIDATE':
      return 'SIGNAL_CANDIDATE';
    case 'CONFIRMED':
      return 'SIGNAL_CONFIRMED';
    case 'INVALIDATED':
      return 'SIGNAL_INVALIDATED';
    case 'EXPIRED':
      return 'SIGNAL_EXPIRED';
    case 'CANCELLED':
      return 'SIGNAL_CANCELLED';
    case 'EXECUTED':
      return 'POSITION_OPENED';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type LifecycleUpdateInput = {
  setup: TradingSetup;
  existing: TradingSignalRecord | null;
  signalId: string;
  eventId: string;
  timestamp: number;
  triggerCandleTimestamp: number;
  algorithmVersion: string;
  configVersion: string;
  score: SignalScore | null;
  /** When true and setup is TRIGGERED, promote CANDIDATE → CONFIRMED. */
  confirm: boolean;
  reasonCodes?: readonly string[];
};

export type LifecycleUpdateResult = {
  signal: TradingSignalRecord;
  events: SignalLifecycleEvent[];
  created: boolean;
  transitioned: boolean;
};

const CONFIRMATION_PATH: readonly SignalStatus[] = [
  'APPROACHING',
  'FORMING',
  'CANDIDATE',
  'CONFIRMED',
];

function statusesToward(from: SignalStatus, to: SignalStatus): SignalStatus[] {
  if (from === to) {
    return [];
  }

  const fromIndex = CONFIRMATION_PATH.indexOf(from);
  const toIndex = CONFIRMATION_PATH.indexOf(to);
  if (fromIndex >= 0 && toIndex > fromIndex) {
    return [...CONFIRMATION_PATH.slice(fromIndex + 1, toIndex + 1)];
  }

  assertSignalTransition(from, to);
  return [to];
}

/**
 * Upsert a trading signal from setup status and emit lifecycle events for each
 * allowed status step (including APPROACHING→…→CONFIRMED promotion).
 */
export function updateSignalLifecycle(input: LifecycleUpdateInput): LifecycleUpdateResult {
  const mapped = setupStatusToSignalStatus(input.setup.status);
  if (mapped === null) {
    throw new Error(`Unsupported setup status: ${input.setup.status}`);
  }

  let nextStatus: SignalStatus = mapped;
  if (
    input.confirm &&
    (mapped === 'CANDIDATE' || mapped === 'FORMING' || mapped === 'APPROACHING')
  ) {
    nextStatus = 'CONFIRMED';
  }

  const deduplicationKey = buildSignalDeduplicationKey({
    instrumentId: input.setup.instrumentId,
    strategy: input.setup.strategy,
    direction: input.setup.direction,
    setupId: input.setup.id,
    triggerCandleTimestamp: input.triggerCandleTimestamp,
    algorithmVersion: input.algorithmVersion,
  });

  const reasonCodes = [...(input.reasonCodes ?? input.setup.reasonCodes)];

  if (input.existing === null) {
    const steps = nextStatus === 'CONFIRMED' ? [...CONFIRMATION_PATH] : [nextStatus];
    let signal: TradingSignalRecord = {
      signalId: input.signalId,
      setupId: input.setup.id,
      instrumentId: input.setup.instrumentId,
      timeframe: input.setup.setupTimeframe,
      strategy: input.setup.strategy,
      direction: input.setup.direction,
      status: steps[0] ?? nextStatus,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      score: input.score,
      reasonCodes,
      deduplicationKey,
      algorithmVersion: input.algorithmVersion,
      configVersion: input.configVersion,
      triggerCandleTimestamp: input.triggerCandleTimestamp,
    };
    const events: SignalLifecycleEvent[] = [
      toLifecycleEvent(signal, `${input.eventId}:${signal.status}`, input.timestamp),
    ];
    for (const status of steps.slice(1)) {
      signal = { ...signal, status, updatedAt: input.timestamp };
      events.push(toLifecycleEvent(signal, `${input.eventId}:${status}`, input.timestamp));
    }
    return {
      signal,
      events,
      created: true,
      transitioned: true,
    };
  }

  if (input.existing.deduplicationKey !== deduplicationKey) {
    throw new Error('Deduplication key mismatch for existing signal');
  }

  if (input.existing.status === nextStatus) {
    const refreshed: TradingSignalRecord = {
      ...input.existing,
      updatedAt: input.timestamp,
      score: input.score ?? input.existing.score,
      reasonCodes: reasonCodes.length > 0 ? reasonCodes : input.existing.reasonCodes,
      configVersion: input.configVersion,
    };
    return {
      signal: refreshed,
      events: [],
      created: false,
      transitioned: false,
    };
  }

  const steps = statusesToward(input.existing.status, nextStatus);
  let signal: TradingSignalRecord = {
    ...input.existing,
    updatedAt: input.timestamp,
    score: input.score ?? input.existing.score,
    reasonCodes,
    configVersion: input.configVersion,
  };
  const events: SignalLifecycleEvent[] = [];
  for (const status of steps) {
    signal = { ...signal, status, updatedAt: input.timestamp };
    events.push(toLifecycleEvent(signal, `${input.eventId}:${status}`, input.timestamp));
  }

  return {
    signal,
    events,
    created: false,
    transitioned: events.length > 0,
  };
}

function toLifecycleEvent(
  signal: TradingSignalRecord,
  eventId: string,
  timestamp: number,
): SignalLifecycleEvent {
  return {
    id: eventId,
    signalId: signal.signalId,
    eventType: signalStatusToEventType(signal.status),
    instrumentId: signal.instrumentId,
    timeframe: signal.timeframe,
    strategy: signal.strategy,
    direction: signal.direction,
    timestamp,
    status: signal.status,
    score: signal.score,
    payload: {
      setupId: signal.setupId,
      triggerCandleTimestamp: signal.triggerCandleTimestamp,
    },
    reasonCodes: signal.reasonCodes,
    deduplicationKey: signal.deduplicationKey,
    algorithmVersion: signal.algorithmVersion,
    configVersion: signal.configVersion,
  };
}
