import { parseInstrumentId } from '@moex/domain';
import { describe, expect, it } from 'vitest';
import type { TradingSetup } from '../strategies/types.js';
import { canTransitionSignalStatus, updateSignalLifecycle } from './lifecycle.js';

const instrumentId = parseInstrumentId('16161616-1616-4161-8161-161616161616');

function setup(status: TradingSetup['status']): TradingSetup {
  return {
    id: 'setup-1',
    instrumentId,
    strategy: 'TREND_PULLBACK',
    direction: 'LONG',
    setupTimeframe: '5m',
    createdAt: 1,
    updatedAt: 2,
    status,
    zoneId: null,
    triggerLevel: null,
    invalidationLevel: null,
    referencePrice: null,
    referenceSwingIds: [],
    referenceProfileIds: [],
    referencePivotSetIds: [],
    reasonCodes: ['SETUP_ZONE_APPROACHED'],
    expiresAt: null,
  };
}

describe('canTransitionSignalStatus', () => {
  it('allows forward lifecycle and terminal exits', () => {
    expect(canTransitionSignalStatus('APPROACHING', 'FORMING')).toBe(true);
    expect(canTransitionSignalStatus('CANDIDATE', 'CONFIRMED')).toBe(true);
    expect(canTransitionSignalStatus('CONFIRMED', 'EXPIRED')).toBe(true);
    expect(canTransitionSignalStatus('INVALIDATED', 'CONFIRMED')).toBe(false);
    expect(canTransitionSignalStatus('EXPIRED', 'EXECUTED')).toBe(false);
  });
});

describe('updateSignalLifecycle', () => {
  it('creates an approaching signal and emits one event', () => {
    const result = updateSignalLifecycle({
      setup: setup('APPROACHING'),
      existing: null,
      signalId: 'sig-1',
      eventId: 'evt:sig-1',
      timestamp: 10,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: false,
    });
    expect(result.created).toBe(true);
    expect(result.signal.status).toBe('APPROACHING');
    expect(result.events[0]?.eventType).toBe('SETUP_APPROACHING');
  });

  it('does not re-emit when status is unchanged', () => {
    const created = updateSignalLifecycle({
      setup: setup('FORMING'),
      existing: null,
      signalId: 'sig-1',
      eventId: 'evt:1',
      timestamp: 10,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: false,
    });
    const again = updateSignalLifecycle({
      setup: setup('FORMING'),
      existing: created.signal,
      signalId: 'sig-1',
      eventId: 'evt:2',
      timestamp: 20,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: false,
    });
    expect(again.transitioned).toBe(false);
    expect(again.events).toHaveLength(0);
  });

  it('promotes triggered setup to CONFIRMED when confirm=true', () => {
    const candidate = updateSignalLifecycle({
      setup: setup('TRIGGERED'),
      existing: null,
      signalId: 'sig-1',
      eventId: 'evt:1',
      timestamp: 10,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: false,
    });
    expect(candidate.signal.status).toBe('CANDIDATE');

    const confirmed = updateSignalLifecycle({
      setup: setup('TRIGGERED'),
      existing: candidate.signal,
      signalId: 'sig-1',
      eventId: 'evt:2',
      timestamp: 20,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: true,
    });
    expect(confirmed.signal.status).toBe('CONFIRMED');
    expect(confirmed.events.map((item) => item.eventType)).toEqual(['SIGNAL_CONFIRMED']);
  });

  it('walks APPROACHING → CONFIRMED when confirm=true on an existing approach signal', () => {
    const approaching = updateSignalLifecycle({
      setup: setup('APPROACHING'),
      existing: null,
      signalId: 'sig-1',
      eventId: 'evt:1',
      timestamp: 10,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: false,
    });
    const confirmed = updateSignalLifecycle({
      setup: setup('TRIGGERED'),
      existing: approaching.signal,
      signalId: 'sig-1',
      eventId: 'evt:2',
      timestamp: 20,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: true,
    });
    expect(confirmed.signal.status).toBe('CONFIRMED');
    expect(confirmed.events.map((item) => item.eventType)).toEqual([
      'SETUP_FORMING',
      'SIGNAL_CANDIDATE',
      'SIGNAL_CONFIRMED',
    ]);
  });

  it('rejects forbidden regressions', () => {
    const confirmed = updateSignalLifecycle({
      setup: setup('TRIGGERED'),
      existing: null,
      signalId: 'sig-1',
      eventId: 'evt:1',
      timestamp: 10,
      triggerCandleTimestamp: 1000,
      algorithmVersion: '1.0.0',
      configVersion: 'cfg-1',
      score: null,
      confirm: true,
    });
    expect(() =>
      updateSignalLifecycle({
        setup: setup('APPROACHING'),
        existing: confirmed.signal,
        signalId: 'sig-1',
        eventId: 'evt:2',
        timestamp: 20,
        triggerCandleTimestamp: 1000,
        algorithmVersion: '1.0.0',
        configVersion: 'cfg-1',
        score: null,
        confirm: false,
      }),
    ).toThrow(/Forbidden signal transition/);
  });
});
