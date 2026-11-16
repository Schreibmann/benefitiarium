import { randomUUID } from 'node:crypto';
import { format as formatDecimal } from '@moex/decimal';
import { parseUuid } from '@moex/domain';
import type {
  LiveSignalRow,
  MarketSignalKind,
  MarketSignalSide,
  MarketSignalsRepository,
  OutboxRepository,
} from '@moex/persistence';
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

function marketKindFromAlert(kind: LevelAlert['kind']): MarketSignalKind {
  if (kind === 'APPROACH') {
    return 'approach';
  }
  if (kind === 'CROSS') {
    return 'cross';
  }
  return 'consolidation';
}

function sideFromAlert(kind: LevelAlert['kind']): MarketSignalSide {
  if (kind === 'CROSS') {
    return 'up';
  }
  return 'above';
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function roundDisplay(raw: string): string {
  try {
    return formatDecimal(raw, 2);
  } catch {
    return raw;
  }
}

function formatInstrumentHeading(input: {
  ticker: string | null;
  name: string | null;
  instrumentUid: string;
  intervalCode: string;
}): string {
  const code = escapeHtml(input.ticker ?? input.instrumentUid);
  const timeframe = escapeHtml(input.intervalCode);
  const name = input.name?.trim() ?? '';
  if (name.length > 0 && name !== input.ticker) {
    return `<b>${code}</b> · ${escapeHtml(name)} · ${timeframe}`;
  }
  return `<b>${code}</b> · ${timeframe}`;
}

function formatLevelAlertText(alert: LevelAlert): string {
  const level = escapeHtml(alert.levelId);
  const levelPrice = escapeHtml(roundDisplay(alert.levelPrice));
  const price = escapeHtml(roundDisplay(alert.referencePrice));
  const kind = escapeHtml(alert.kind);
  return [
    formatInstrumentHeading({
      ticker: alert.ticker,
      name: alert.name,
      instrumentUid: alert.instrumentUid,
      intervalCode: alert.intervalCode,
    }),
    `${kind} · уровень <b>${level}</b> = <code>${levelPrice}</code>`,
    `цена <code>${price}</code>`,
    `ATR dist <code>${escapeHtml(roundDisplay(alert.distanceAtr))}</code>`,
  ].join('\n');
}

function formatEntryConfirmText(signal: LiveSignalRow): string {
  const timeframe = escapeHtml(signal.intervalCode);
  const direction = escapeHtml(signal.direction);
  const price = escapeHtml(roundDisplay(signal.referencePrice));
  const code = escapeHtml(signal.ticker ?? signal.instrumentUid);
  return [
    `<b>${code}</b> · ${timeframe}`,
    `entry_confirm · <b>${direction}</b>`,
    `цена <code>${price}</code>`,
  ].join('\n');
}

/**
 * Stub Telegram publisher: enqueues outbox `signal.telegram` and logs.
 * Used when chat/topic env is not configured.
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

export type QueueTelegramNotifierOptions = {
  marketSignals: MarketSignalsRepository;
  outbox: OutboxRepository;
  chatId: string;
  topicAlerts: number;
  logger: TelegramNotifierLogger;
  createId?: () => string;
};

/**
 * Durable Live → Telegram path: atomic market_signals + notifications (ALERTS topic).
 * Outbox `signal.telegram` remains audit-only with delivery: notifications_queue.
 */
export function createQueueTelegramNotifier(input: QueueTelegramNotifierOptions): TelegramNotifier {
  const createId = input.createId ?? (() => randomUUID());

  return {
    async publishSignal(signal, kind = 'entry_confirm') {
      const signalId = parseUuid(createId());
      const notificationId = parseUuid(createId());
      const eventId = parseUuid(createId());
      const text = formatEntryConfirmText(signal);
      const result = await input.marketSignals.insertSignalWithNotification({
        signal: {
          id: signalId,
          triggerId: 'live_tse_entry',
          triggerVersion: '1',
          instrumentUid: signal.instrumentUid,
          ticker: signal.ticker,
          timeframe: signal.intervalCode,
          kind: 'entry_confirm',
          levelName: 'TSE',
          levelValue: signal.referencePrice,
          side: signal.direction === 'sell' ? 'down' : 'up',
          price: signal.referencePrice,
          previousPrice: null,
          evalMode: 'close',
          periodId: signal.eventKey,
          candleTime: signal.sourceEventTime,
          payload: {
            liveSignalId: signal.id,
            direction: signal.direction,
            status: signal.status,
            reasons: signal.reasons,
            features: signal.features,
            alertKind: kind,
          },
          dedupeKey: `live:entry:${signal.id}`,
        },
        notification: {
          id: notificationId,
          channel: 'telegram',
          target: input.chatId,
          text,
          threadId: input.topicAlerts,
        },
      });
      await input.outbox.enqueue({
        id: eventId,
        aggregateType: 'live_signal',
        aggregateId: signal.id,
        eventType: 'signal.telegram',
        payload: {
          kind,
          signalId: signal.id,
          marketSignalId: result.signal?.id ?? null,
          notificationId: result.notification?.id ?? null,
          inserted: result.inserted,
          instrumentUid: signal.instrumentUid,
          ticker: signal.ticker,
          intervalCode: signal.intervalCode,
          direction: signal.direction,
          status: signal.status,
          referencePrice: signal.referencePrice,
          sourceEventTime: signal.sourceEventTime,
          delivery: 'notifications_queue',
          threadId: input.topicAlerts,
        },
      });
      input.logger.info('telegram queue: entry_confirm enqueued', {
        kind,
        signalId: signal.id,
        inserted: result.inserted,
        outboxEventId: eventId,
      });
    },

    async publishLevelAlert(alert) {
      const signalId = parseUuid(createId());
      const notificationId = parseUuid(createId());
      const eventId = parseUuid(createId());
      const marketKind = marketKindFromAlert(alert.kind);
      const telegramKind = alertKindFromLevel(alert.kind);
      const text = formatLevelAlertText(alert);
      const dedupeKey = `live:level:${alert.instrumentUid}:${alert.intervalCode}:${alert.levelId}:${alert.kind}:${alert.barTimeStart}`;
      const result = await input.marketSignals.insertSignalWithNotification({
        signal: {
          id: signalId,
          triggerId: 'live_level_alert',
          triggerVersion: '1',
          instrumentUid: alert.instrumentUid,
          ticker: alert.ticker,
          timeframe: alert.intervalCode,
          kind: marketKind,
          levelName: alert.levelId,
          levelValue: roundDisplay(alert.levelPrice),
          side: sideFromAlert(alert.kind),
          price: alert.referencePrice,
          previousPrice: null,
          evalMode: 'intrabar',
          periodId: `${alert.instrumentUid}:${alert.intervalCode}:${alert.barTimeStart}`,
          candleTime: alert.barTimeStart,
          payload: {
            levelSources: alert.levelSources,
            distanceAtr: alert.distanceAtr,
            alertKind: alert.kind,
          },
          dedupeKey,
        },
        notification: {
          id: notificationId,
          channel: 'telegram',
          target: input.chatId,
          text,
          threadId: input.topicAlerts,
        },
      });
      await input.outbox.enqueue({
        id: eventId,
        aggregateType: 'live_level_alert',
        aggregateId: `${alert.instrumentUid}:${alert.levelId}:${alert.kind}`,
        eventType: 'signal.telegram',
        payload: {
          kind: telegramKind,
          alertKind: alert.kind,
          marketSignalId: result.signal?.id ?? null,
          notificationId: result.notification?.id ?? null,
          inserted: result.inserted,
          instrumentUid: alert.instrumentUid,
          ticker: alert.ticker,
          intervalCode: alert.intervalCode,
          levelId: alert.levelId,
          levelPrice: alert.levelPrice,
          levelSources: alert.levelSources,
          distanceAtr: alert.distanceAtr,
          referencePrice: alert.referencePrice,
          barTimeStart: alert.barTimeStart,
          delivery: 'notifications_queue',
          threadId: input.topicAlerts,
        },
      });
      input.logger.info('telegram queue: level alert enqueued', {
        kind: telegramKind,
        instrumentUid: alert.instrumentUid,
        levelId: alert.levelId,
        inserted: result.inserted,
        outboxEventId: eventId,
      });
    },
  };
}
