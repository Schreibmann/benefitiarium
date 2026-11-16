import type { CanonicalStreamCandle, StreamSubscriptionAck } from '@moex/broker-tinvest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveCandleStreamLog } from './live-candle-stream-log.js';

function fakeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

const sampleCandle: CanonicalStreamCandle = {
  instrumentUid: 'uid-1',
  interval: '5m',
  timeStart: '2026-11-16T10:00:00.000Z',
  open: '100',
  high: '101',
  low: '99',
  close: '100.5',
  volumeLots: '10',
  volumeBuyLots: null,
  volumeSellLots: null,
  deliveryMode: 'LIVE_UPDATES',
  barState: 'UPDATING',
  waitingClose: false,
  candleSource: 'EXCHANGE',
  lastTradeTs: null,
  figi: null,
  ticker: null,
  classCode: null,
  receivedAt: '2026-11-16T10:00:01.000Z',
  revision: 1,
  eventHash: 'hash-1',
  historicalProviderIsComplete: null,
};

const sampleAck: StreamSubscriptionAck = {
  instrumentUid: 'uid-1',
  interval: '5m',
  status: 'SUCCESS',
  subscriptionId: 'sub-1',
  waitingClose: false,
};

describe('createLiveCandleStreamLog', () => {
  it('is a no-op when disabled', () => {
    const logger = fakeLogger();
    const log = createLiveCandleStreamLog({ enabled: false, logger });
    expect(log.enabled).toBe(false);
    log.candle(sampleCandle, { leaseCount: 1 });
    log.subscriptionAcks([sampleAck]);
    log.clientEvent('live candle stream subscribe', { instrumentId: 'uid-1' });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('emits structured analysis logs when enabled', () => {
    const logger = fakeLogger();
    const log = createLiveCandleStreamLog({ enabled: true, logger });
    expect(log.enabled).toBe(true);

    log.candle(sampleCandle, { leaseCount: 2 });
    expect(logger.info).toHaveBeenCalledWith(
      'live candle stream event',
      expect.objectContaining({
        instrumentUid: 'uid-1',
        interval: '5m',
        barState: 'UPDATING',
        volumeLots: '10',
        leaseCount: 2,
      }),
    );

    log.subscriptionAcks([sampleAck]);
    expect(logger.info).toHaveBeenCalledWith(
      'live candle stream subscription ack',
      expect.objectContaining({
        status: 'SUCCESS',
        subscriptionId: 'sub-1',
      }),
    );

    log.clientEvent('live candle stream subscribe', {
      instrumentId: 'uid-1',
      interval: '5m',
    });
    expect(logger.info).toHaveBeenCalledWith(
      'live candle stream subscribe',
      expect.objectContaining({ instrumentId: 'uid-1' }),
    );
  });
});
