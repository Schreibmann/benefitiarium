import { parseDecimalString, parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import { createMarketEventNormalizerState, normalizeMarketEvent } from './normalizer.js';
import type { EngineMarketEvent } from './types.js';

const instrumentId = parseInstrumentId('22222222-2222-4222-8222-222222222222');

function event(overrides: { eventId: string; revision: number; high?: string }): EngineMarketEvent {
  return {
    eventId: overrides.eventId,
    receivedAt: Date.parse('2026-11-14T10:05:01.000Z'),
    eventTimestamp: Date.parse('2026-11-14T10:05:00.000Z'),
    kind: 'CANDLE_CLOSED',
    candle: {
      instrumentId,
      timeframe: '5m',
      timestamp: Date.parse('2026-11-14T10:00:00.000Z'),
      closeTimestamp: Date.parse('2026-11-14T10:05:00.000Z'),
      open: parseDecimalString('100'),
      high: parseDecimalString(overrides.high ?? '110'),
      low: parseDecimalString('95'),
      close: parseDecimalString('105'),
      volume: parseDecimalString('10'),
      status: 'CLOSED',
      revision: overrides.revision,
      sourceEventId: overrides.eventId,
    },
  };
}

describe('normalizeMarketEvent', () => {
  it('accepts the first valid event and dedupes by eventId', () => {
    const state = createMarketEventNormalizerState();
    const first = normalizeMarketEvent(state, event({ eventId: 'a', revision: 1 }), 1);
    expect(first.status).toBe('accepted');

    const dup = normalizeMarketEvent(state, event({ eventId: 'a', revision: 2 }), 2);
    expect(dup.status).toBe('duplicate');
  });

  it('quarantines non-monotonic revision for the same bar', () => {
    const state = createMarketEventNormalizerState();
    expect(normalizeMarketEvent(state, event({ eventId: 'r1', revision: 2 }), 1).status).toBe(
      'accepted',
    );

    const lower = normalizeMarketEvent(state, event({ eventId: 'r0', revision: 1 }), 2);
    expect(lower.status).toBe('quarantined');
    if (lower.status === 'quarantined') {
      expect(lower.quarantined.issues[0]?.reasonCode).toBe('DATA_REVISION_NON_MONOTONIC');
    }
  });

  it('quarantines invalid OHLCV before mutating revision state', () => {
    const state = createMarketEventNormalizerState();
    const bad = normalizeMarketEvent(state, event({ eventId: 'bad', revision: 1, high: '90' }), 1);
    expect(bad.status).toBe('quarantined');
    expect(state.latestRevisionByBar.size).toBe(0);
  });
});
