import { randomUUID } from 'node:crypto';
import { parseUuid } from '@moex/domain';
import type { LiveSignalRow, OutboxRepository } from '@moex/persistence';
import type { LevelAlert } from './level-alert-engine.js';

export type TelegramAlertKind =
  | 'level_approach'
  | 'level_cross'
  | 'level_consolidation'
  | 'entry_confirm';

export type TelegramNotifier = {
  publishSignal: (signal: LiveSignalRow, kind?: TelegramAlertKind) => Promise<void>;
  publishLevelAlert: (alert: LevelAlert) => Promise<void>;
};

export type TelegramNotifierLogger = {
  info: (
    message: string,
    fields?: Record<string, string | number | boolean | null | undefined>,
  ) => void;
};

function alertKindFromLevel(kind: LevelAlert['kind']): TelegramAlertKind {
  if (kind === 'APPROACH') {
    return 'level_approach';
  }
  if (kind === 'CROSS') {
    return 'level_cross';
  }
  return 'level_consolidation';
}

/**
 * Stub Telegram publisher: enqueues outbox `signal.telegram` and logs.
 * Real bot token / channel id settings are deferred.
 */
export function createStubTelegramNotifier(input: {
  outbox: OutboxRepository;
  logger: TelegramNotifierLogger;
}): TelegramNotifier {
  return {
    async publishSignal(signal, kind = 'entry_confirm') {
      const eventId = parseUuid(randomUUID());
      await input.outbox.enqueue({
        id: eventId,
        aggregateType: 'live_signal',
        aggregateId: signal.id,
        eventType: 'signal.telegram',
        payload: {
          kind,
          signalId: signal.id,
          instrumentUid: signal.instrumentUid,
          ticker: signal.ticker,
          intervalCode: signal.intervalCode,
          direction: signal.direction,
          status: signal.status,
          referencePrice: signal.referencePrice,
          reasons: signal.reasons,
          sourceEventTime: signal.sourceEventTime,
          delivery: 'stub',
        },
      });
      input.logger.info('telegram stub: signal queued for channel delivery', {
        kind,
        signalId: signal.id,
        outboxEventId: eventId,
        instrumentUid: signal.instrumentUid,
        direction: signal.direction,
      });
    },

    async publishLevelAlert(alert) {
      const eventId = parseUuid(randomUUID());
      const kind = alertKindFromLevel(alert.kind);
      await input.outbox.enqueue({
        id: eventId,
        aggregateType: 'live_level_alert',
        aggregateId: `${alert.instrumentUid}:${alert.levelId}:${alert.kind}`,
        eventType: 'signal.telegram',
        payload: {
          kind,
          alertKind: alert.kind,
          instrumentUid: alert.instrumentUid,
          ticker: alert.ticker,
          intervalCode: alert.intervalCode,
          levelId: alert.levelId,
          levelPrice: alert.levelPrice,
          levelSources: alert.levelSources,
          distanceAtr: alert.distanceAtr,
          referencePrice: alert.referencePrice,
          barTimeStart: alert.barTimeStart,
          delivery: 'stub',
        },
      });
      input.logger.info('telegram stub: level alert queued for channel delivery', {
        kind,
        instrumentUid: alert.instrumentUid,
        levelId: alert.levelId,
        outboxEventId: eventId,
      });
    },
  };
}
