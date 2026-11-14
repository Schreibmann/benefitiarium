import type { TriggerHit } from '@moex/signal-triggers';
import { describe, expect, it } from 'vitest';
import { formatTelegramMessage } from './format-telegram-message.js';

const hit: TriggerHit = {
  triggerId: 'fib_pivot_cross',
  triggerVersion: '1.0.0',
  kind: 'cross',
  levelName: 'P',
  levelValue: '100.5',
  side: 'up',
  price: '100.6',
  previousPrice: '99.9',
  periodId: 'valid:open',
  candleTimeStart: '2026-11-14T10:00:00.000Z',
  dedupeKey: 'k',
  features: {},
  reasons: ['cross'],
};

describe('formatTelegramMessage', () => {
  it('renders Russian HTML with ticker and level', () => {
    const text = formatTelegramMessage({
      hit,
      ticker: 'NGZ6',
      timeframe: '5m',
      timeZone: 'Europe/Moscow',
    });
    expect(text).toContain('<b>NGZ6</b>');
    expect(text).toContain('пересечение вверх');
    expect(text).toContain('<b>P</b>');
    expect(text).toContain('<code>100.5</code>');
    expect(text).toContain('<code>100.6</code>');
  });

  it('escapes HTML in ticker', () => {
    const text = formatTelegramMessage({
      hit,
      ticker: 'A<B>&C',
      timeframe: '1h',
      timeZone: 'Europe/Moscow',
    });
    expect(text).toContain('<b>A&lt;B&gt;&amp;C</b>');
  });
});
