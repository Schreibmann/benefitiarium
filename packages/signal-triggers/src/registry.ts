import { fibPivotApproachTrigger } from './triggers/fib-pivot-approach.js';
import { fibPivotCrossTrigger } from './triggers/fib-pivot-cross.js';
import type { Trigger, TriggerContext, TriggerHit, TriggerId, TriggerStateStore } from './types.js';

const BUILTIN_TRIGGERS: readonly Trigger[] = [fibPivotApproachTrigger, fibPivotCrossTrigger];

export type TriggerRegistry = {
  get: (id: TriggerId) => Trigger | undefined;
  list: () => readonly Trigger[];
  evaluate: (
    ids: readonly TriggerId[],
    ctx: TriggerContext,
    state: TriggerStateStore,
  ) => TriggerHit[];
};

export function createTriggerRegistry(extra: readonly Trigger[] = []): TriggerRegistry {
  const byId = new Map<TriggerId, Trigger>();
  for (const trigger of [...BUILTIN_TRIGGERS, ...extra]) {
    byId.set(trigger.id, trigger);
  }

  return {
    get(id) {
      return byId.get(id);
    },
    list() {
      return [...byId.values()];
    },
    evaluate(ids, ctx, state) {
      const hits: TriggerHit[] = [];
      for (const id of ids) {
        const trigger = byId.get(id);
        if (trigger === undefined) {
          continue;
        }
        hits.push(...trigger.evaluate(ctx, state));
      }
      return hits;
    },
  };
}
