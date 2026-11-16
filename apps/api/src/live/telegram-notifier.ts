import { randomUUID } from 'node:crypto';
import { parseUuid } from '@moex/domain';
import type { LiveSignalRow, OutboxRepository } from '@moex/persistence';

export type TelegramNotifier = {
  publishSignal: (signal: LiveSignalRow) => Promise<void>;
};

export type TelegramNotifierLogger = {
  info: (
    message: string,
    fields?: Record<string, string | number | boolean | null | undefined>,
  ) => void;
};

/**
 * Stub Telegram publisher: enqueues outbox `signal.telegram` and logs.
 * Real bot token / channel id settings are deferred.
 */
export function createStubTelegramNotifier(input: {
  outbox: OutboxRepository;
  logger: TelegramNotifierLogger;
}): TelegramNotifier {
  return {
    async publishSignal(signal) {
      const eventId = parseUuid(randomUUID());
      await input.outbox.enqueue({
        id: eventId,
        aggregateType: 'live_signal',
        aggregateId: signal.id,
        eventType: 'signal.telegram',
        payload: {
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
        signalId: signal.id,
        outboxEventId: eventId,
        instrumentUid: signal.instrumentUid,
        direction: signal.direction,
      });
    },
  };
}
