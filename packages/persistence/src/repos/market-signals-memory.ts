import { parseIsoDateTime, type UUID } from '@moex/domain';
import type { MarketSignalsRepository } from './market-signals.js';
import type {
  ApproachStateRow,
  MarketSignal,
  NewMarketSignal,
  NewNotificationForSignal,
  Notification,
} from './market-signals-types.js';

export type MemoryMarketSignalsStore = MarketSignalsRepository & {
  snapshotSignals: () => MarketSignal[];
  snapshotNotifications: () => Notification[];
};

function cloneSignal(row: MarketSignal): MarketSignal {
  return { ...row, payload: { ...row.payload } };
}

function cloneNotification(row: Notification): Notification {
  return { ...row };
}

function toSignal(signal: NewMarketSignal, createdAt: string): MarketSignal {
  return {
    id: signal.id,
    triggerId: signal.triggerId,
    triggerVersion: signal.triggerVersion,
    instrumentUid: signal.instrumentUid,
    ticker: signal.ticker,
    timeframe: signal.timeframe,
    kind: signal.kind,
    levelName: signal.levelName,
    levelValue: signal.levelValue,
    side: signal.side,
    price: signal.price,
    previousPrice: signal.previousPrice,
    evalMode: signal.evalMode,
    periodId: signal.periodId,
    candleTime: parseIsoDateTime(signal.candleTime),
    payload: { ...signal.payload },
    dedupeKey: signal.dedupeKey,
    createdAt: signal.createdAt ?? parseIsoDateTime(createdAt),
  };
}

export function createMemoryMarketSignalsStore(
  now: () => Date = () => new Date(),
): MemoryMarketSignalsStore {
  const signals = new Map<string, MarketSignal>();
  const notifications = new Map<string, Notification>();
  const dedupe = new Map<string, string>();

  return {
    insertSignalWithNotification: async (input: {
      signal: NewMarketSignal;
      notification: NewNotificationForSignal;
    }) => {
      if (dedupe.has(input.signal.dedupeKey)) {
        return { inserted: false, signal: null, notification: null };
      }
      const createdAt = now().toISOString();
      const signal = toSignal(input.signal, createdAt);
      const notification: Notification = {
        id: input.notification.id,
        channel: input.notification.channel,
        target: input.notification.target,
        signalId: signal.id,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: parseIsoDateTime(createdAt),
        lastError: null,
        text: input.notification.text,
        providerMessageId: null,
        createdAt: parseIsoDateTime(createdAt),
        sentAt: null,
      };
      signals.set(signal.id, signal);
      notifications.set(notification.id, notification);
      dedupe.set(signal.dedupeKey, signal.id);
      return {
        inserted: true,
        signal: cloneSignal(signal),
        notification: cloneNotification(notification),
      };
    },

    listActiveApproachState: async (input = {}) => {
      const uidFilter = input.instrumentUids;
      const periodFilter = input.periodIds;
      const rows: ApproachStateRow[] = [];
      const seen = new Set<string>();
      for (const signal of signals.values()) {
        if (signal.kind !== 'approach') {
          continue;
        }
        if (signal.side !== 'above' && signal.side !== 'below') {
          continue;
        }
        if (
          uidFilter !== undefined &&
          uidFilter.length > 0 &&
          !uidFilter.includes(signal.instrumentUid)
        ) {
          continue;
        }
        if (
          periodFilter !== undefined &&
          periodFilter.length > 0 &&
          !periodFilter.includes(signal.periodId)
        ) {
          continue;
        }
        const key = [
          signal.instrumentUid,
          signal.timeframe,
          signal.periodId,
          signal.levelName,
          signal.side,
        ].join('|');
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        rows.push({
          instrumentUid: signal.instrumentUid,
          timeframe: signal.timeframe,
          periodId: signal.periodId,
          levelName: signal.levelName,
          side: signal.side,
        });
      }
      return rows;
    },

    claimDueNotifications: async (limit = 20) => {
      const nowIso = now().toISOString();
      const due = [...notifications.values()]
        .filter((row) => row.status === 'pending' && row.nextAttemptAt <= nowIso)
        .sort((a, b) => {
          const byAttempt = a.nextAttemptAt.localeCompare(b.nextAttemptAt);
          if (byAttempt !== 0) {
            return byAttempt;
          }
          return a.createdAt.localeCompare(b.createdAt);
        })
        .slice(0, limit);

      const claimed: Notification[] = [];
      for (const row of due) {
        const updated: Notification = {
          ...row,
          status: 'sending',
          attempts: row.attempts + 1,
        };
        notifications.set(row.id, updated);
        claimed.push(cloneNotification(updated));
      }
      return claimed;
    },

    markSent: async (id: UUID, input) => {
      const row = notifications.get(id);
      if (row === undefined) {
        throw new Error(`Notification not found: ${id}`);
      }
      const updated: Notification = {
        ...row,
        status: 'sent',
        providerMessageId: input.providerMessageId,
        sentAt: parseIsoDateTime(input.sentAt),
        lastError: null,
      };
      notifications.set(id, updated);
      return cloneNotification(updated);
    },

    markFailed: async (id, input) => {
      const row = notifications.get(id);
      if (row === undefined) {
        throw new Error(`Notification not found: ${id}`);
      }
      const maxAttempts = input.maxAttempts ?? 10;
      const dead = input.dead === true || row.attempts >= maxAttempts;
      const retryAfterSeconds =
        input.retryAfterSeconds ?? Math.min(300, 2 ** Math.min(Math.max(row.attempts, 1), 8));
      const nextAttemptAt = dead
        ? row.nextAttemptAt
        : parseIsoDateTime(new Date(now().getTime() + retryAfterSeconds * 1000).toISOString());
      const updated: Notification = {
        ...row,
        status: dead ? 'dead' : 'pending',
        lastError: input.errorMessage,
        nextAttemptAt,
      };
      notifications.set(id, updated);
      return cloneNotification(updated);
    },

    snapshotSignals: () => [...signals.values()].map(cloneSignal),
    snapshotNotifications: () => [...notifications.values()].map(cloneNotification),
  };
}
