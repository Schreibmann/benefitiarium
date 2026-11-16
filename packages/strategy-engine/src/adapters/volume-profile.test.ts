import { describe, expect, it } from 'vitest';
import { adaptVolumeProfile, emptyVolumeProfileUnavailable } from './volume-profile.js';

describe('adaptVolumeProfile', () => {
  it('marks trade-level profiles without gaps as EXACT', () => {
    const result = adaptVolumeProfile({
      source: 'trades',
      scope: 'EXPLICIT_WINDOW',
      from: 0,
      to: 60_000,
      isDeveloping: false,
      calculation: {
        trades: [
          { price: '100', quantity: '10', direction: 'buy' },
          { price: '101', quantity: '40', direction: 'sell' },
          { price: '101', quantity: '10', direction: 'buy' },
          { price: '102', quantity: '20', direction: 'sell' },
        ],
        tickSize: '1',
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.profile.qualityLabel).toBe('EXACT');
    expect(result.profile.poc).toBe('101');
    expect(result.profile.algorithmId).toBe('HORIZONTAL_VOLUME_TRADES');
  });

  it('marks OHLCV estimate profiles as APPROXIMATE', () => {
    const result = adaptVolumeProfile({
      source: 'ohlcv_estimate',
      scope: 'EXPLICIT_WINDOW',
      from: 0,
      to: 60_000,
      isDeveloping: true,
      calculation: {
        candles: [
          { high: '102', low: '100', volume: '30' },
          { high: '101', low: '101', volume: '40' },
        ],
        tickSize: '1',
        rowSizeInTicks: 1,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.profile.qualityLabel).toBe('APPROXIMATE');
    expect(result.profile.reasonCodes).toContain('VOLUME_PROFILE_APPROXIMATE');
  });

  it('returns UNAVAILABLE for explicit unavailable input', () => {
    const result = emptyVolumeProfileUnavailable('CURRENT_SESSION', 0, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCodes).toContain('VOLUME_PROFILE_UNAVAILABLE');
    }
  });
});
