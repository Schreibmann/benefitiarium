import { describe, expect, it } from 'vitest';
import {
  createDefaultOnboardingState,
  nextOnboardingStatus,
  onboardingStatusLabel,
} from './onboarding-steps.js';
import {
  ONBOARDING_STORAGE_KEY,
  parseOnboardingState,
  readOnboardingState,
  setOnboardingStepStatus,
  writeOnboardingState,
} from './onboarding-store.js';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('onboarding-store', () => {
  it('returns defaults for missing or invalid JSON', () => {
    expect(parseOnboardingState(null)).toEqual(createDefaultOnboardingState());
    expect(parseOnboardingState('{')).toEqual(createDefaultOnboardingState());
    expect(parseOnboardingState('"x"')).toEqual(createDefaultOnboardingState());
  });

  it('merges known step statuses and ignores junk keys', () => {
    const parsed = parseOnboardingState(
      JSON.stringify({
        'connect-market-data': 'done',
        watchlist: 'in_progress',
        bogus: 'done',
        'sandbox-run': 'not_a_status',
      }),
    );
    expect(parsed['connect-market-data']).toBe('done');
    expect(parsed.watchlist).toBe('in_progress');
    expect(parsed['sandbox-run']).toBe('blocked');
  });

  it('persists and reads state from storage', () => {
    const storage = new MemoryStorage();
    const state = setOnboardingStepStatus(
      createDefaultOnboardingState(),
      'sandbox-account',
      'done',
    );
    writeOnboardingState(storage, state);
    expect(storage.getItem(ONBOARDING_STORAGE_KEY)).not.toBeNull();
    expect(readOnboardingState(storage)['sandbox-account']).toBe('done');
  });

  it('cycles step status for local progress UI', () => {
    expect(nextOnboardingStatus('not_started')).toBe('in_progress');
    expect(nextOnboardingStatus('in_progress')).toBe('done');
    expect(nextOnboardingStatus('done')).toBe('not_started');
    expect(onboardingStatusLabel('blocked')).toBe('BLOCKED');
  });
});
