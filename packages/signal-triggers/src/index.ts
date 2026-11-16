export { buildApproachStateKey, buildTriggerDedupeKey } from './dedupe-key.js';
export {
  crossedDown,
  crossedUp,
  isWithinPercent,
  leftApproachBand,
  percentDistanceToLevel,
} from './level-math.js';
export { levelsFromPivotPeriod } from './level-set.js';
export { createTriggerRegistry, type TriggerRegistry } from './registry.js';
export { createInMemoryTriggerStateStore } from './state.js';
export {
  FIB_PIVOT_APPROACH_VERSION,
  fibPivotApproachTrigger,
} from './triggers/fib-pivot-approach.js';
export { FIB_PIVOT_CROSS_VERSION, fibPivotCrossTrigger } from './triggers/fib-pivot-cross.js';
export type {
  ApproachPctByTimeframe,
  ApproachStateKey,
  EvalMode,
  Level,
  LevelSet,
  SignalTimeframe,
  Trigger,
  TriggerContext,
  TriggerHit,
  TriggerHitKind,
  TriggerId,
  TriggerSide,
  TriggerStateStore,
} from './types.js';

export const packageName = '@moex/signal-triggers' as const;
