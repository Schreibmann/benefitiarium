export type EvalMode = 'close' | 'intrabar';

export type SignalTimeframe = '5m' | '1h';

export type TriggerId = 'fib_pivot_approach' | 'fib_pivot_cross';

export type TriggerHitKind = 'approach' | 'cross';

/** Approach: price side relative to level. Cross: direction of the move. */
export type TriggerSide = 'above' | 'below' | 'up' | 'down';

export type Level = {
  name: string;
  value: string;
};

export type LevelSet = {
  source: string;
  periodId: string;
  quality: 'ok' | 'DEGENERATE_RANGE';
  levels: Level[];
};

export type ApproachPctByTimeframe = {
  '5m': string;
  '1h': string;
};

export type TriggerContext = {
  instrumentUid: string;
  ticker: string | null;
  timeframe: SignalTimeframe;
  price: string;
  previousPrice: string | null;
  evalMode: EvalMode;
  candleTimeStart: string;
  levelSet: LevelSet;
  approachPctByTimeframe: ApproachPctByTimeframe;
};

export type TriggerHit = {
  triggerId: TriggerId;
  triggerVersion: string;
  kind: TriggerHitKind;
  levelName: string;
  levelValue: string;
  side: TriggerSide;
  price: string;
  previousPrice: string | null;
  periodId: string;
  candleTimeStart: string;
  dedupeKey: string;
  features: Record<string, string | number | boolean>;
  reasons: string[];
};

export type ApproachStateKey = string;

export type TriggerStateStore = {
  isApproachArmed: (key: ApproachStateKey) => boolean;
  markApproachFired: (key: ApproachStateKey) => void;
  clearApproach: (key: ApproachStateKey) => void;
  hydrateApproachKeys: (keys: Iterable<ApproachStateKey>) => void;
  snapshotFiredKeys: () => readonly ApproachStateKey[];
};

export type Trigger = {
  id: TriggerId;
  version: string;
  evaluate: (ctx: TriggerContext, state: TriggerStateStore) => TriggerHit[];
};
