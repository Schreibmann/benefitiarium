import { describe, expect, it } from 'vitest';
import { nextReconnectDelayMs } from './reconnect-policy.js';

describe('nextReconnectDelayMs', () => {
  it('grows exponentially and applies jitter', () => {
    const noJitter = nextReconnectDelayMs(
      3,
      { initialDelayMs: 1000, maxDelayMs: 60_000, jitterRatio: 0 },
      () => 0.5,
    );
    expect(noJitter).toBe(8000);

    const withJitter = nextReconnectDelayMs(
      1,
      { initialDelayMs: 1000, maxDelayMs: 60_000, jitterRatio: 0.2 },
      () => 1,
    );
    expect(withJitter).toBeGreaterThan(2000);
  });
});
