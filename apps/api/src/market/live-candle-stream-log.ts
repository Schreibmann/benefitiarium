import type { CanonicalStreamCandle, StreamSubscriptionAck } from '@moex/broker-tinvest';
import type { Logger } from '@moex/observability';

export type LiveCandleStreamLog = {
  enabled: boolean;
  candle: (candle: CanonicalStreamCandle, fields?: { leaseCount?: number }) => void;
  subscriptionAcks: (acks: readonly StreamSubscriptionAck[]) => void;
  clientEvent: (message: string, fields: Record<string, string | number | boolean | null>) => void;
};

/**
 * Gated Live candle-stream analysis logger.
 * When disabled, all methods are no-ops. Never logs tokens or credentials.
 */
export function createLiveCandleStreamLog(input: {
  enabled: boolean;
  logger: Logger;
}): LiveCandleStreamLog {
  if (!input.enabled) {
    return {
      enabled: false,
      candle: () => undefined,
      subscriptionAcks: () => undefined,
      clientEvent: () => undefined,
    };
  }

  return {
    enabled: true,
    candle: (candle, fields) => {
      input.logger.info('live candle stream event', {
        instrumentUid: candle.instrumentUid,
        interval: candle.interval,
        barState: candle.barState,
        deliveryMode: candle.deliveryMode,
        waitingClose: candle.waitingClose,
        timeStart: candle.timeStart,
        revision: candle.revision,
        eventHash: candle.eventHash,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volumeLots: candle.volumeLots,
        leaseCount: fields?.leaseCount ?? null,
      });
    },
    subscriptionAcks: (acks) => {
      for (const ack of acks) {
        input.logger.info('live candle stream subscription ack', {
          instrumentUid: ack.instrumentUid,
          interval: ack.interval,
          status: ack.status,
          waitingClose: ack.waitingClose,
          subscriptionId: ack.subscriptionId,
        });
      }
    },
    clientEvent: (message, fields) => {
      input.logger.info(message, fields);
    },
  };
}
