import type { ApproachStateKey, TriggerStateStore } from './types.js';

export function createInMemoryTriggerStateStore(
  initialFired: Iterable<ApproachStateKey> = [],
): TriggerStateStore {
  const fired = new Set<ApproachStateKey>(initialFired);

  return {
    isApproachArmed(key) {
      return !fired.has(key);
    },
    markApproachFired(key) {
      fired.add(key);
    },
    clearApproach(key) {
      fired.delete(key);
    },
    hydrateApproachKeys(keys) {
      for (const key of keys) {
        fired.add(key);
      }
    },
    snapshotFiredKeys() {
      return [...fired];
    },
  };
}
