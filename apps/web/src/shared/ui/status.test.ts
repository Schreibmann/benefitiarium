import { describe, expect, it } from 'vitest';
import { marketStatusLabel, marketStatusTone } from './status.js';

describe('market status helpers', () => {
  it('maps statuses to labels', () => {
    expect(marketStatusLabel('realtime')).toBe('REALTIME');
    expect(marketStatusLabel('stale')).toBe('STALE');
    expect(marketStatusLabel('offline')).toBe('OFFLINE');
  });

  it('maps statuses to badge tones', () => {
    expect(marketStatusTone('realtime')).toBe('positive');
    expect(marketStatusTone('delayed')).toBe('warning');
    expect(marketStatusTone('offline')).toBe('negative');
    expect(marketStatusTone('connecting')).toBe('info');
  });
});
