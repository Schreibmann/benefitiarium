import { buildApproachStateKey, buildTriggerDedupeKey } from '../dedupe-key.js';
import { crossedDown, crossedUp, isWithinPercent, leftApproachBand } from '../level-math.js';
import type { Trigger, TriggerHit } from '../types.js';

export const FIB_PIVOT_APPROACH_VERSION = '1.0.0' as const;

export const fibPivotApproachTrigger: Trigger = {
  id: 'fib_pivot_approach',
  version: FIB_PIVOT_APPROACH_VERSION,
  evaluate(ctx, state) {
    if (ctx.levelSet.quality === 'DEGENERATE_RANGE') {
      return [];
    }

    const pct = ctx.approachPctByTimeframe[ctx.timeframe];
    const hits: TriggerHit[] = [];
    const previousPrice = ctx.previousPrice;

    for (const level of ctx.levelSet.levels) {
      const crossed =
        previousPrice !== null &&
        (crossedUp(previousPrice, ctx.price, level.value) ||
          crossedDown(previousPrice, ctx.price, level.value));

      const proximity = isWithinPercent(ctx.price, level.value, pct);
      const approachSide: 'above' | 'below' | null =
        proximity.side === 'above' || proximity.side === 'below' ? proximity.side : null;

      if (approachSide === null) {
        // Exact touch without a previous price is treated as neither approach side.
        continue;
      }

      const stateKey = buildApproachStateKey({
        instrumentUid: ctx.instrumentUid,
        timeframe: ctx.timeframe,
        periodId: ctx.levelSet.periodId,
        levelName: level.name,
        side: approachSide,
      });

      if (crossed) {
        state.clearApproach(stateKey);
        continue;
      }

      if (leftApproachBand(ctx.price, level.value, pct)) {
        state.clearApproach(stateKey);
        continue;
      }

      if (!proximity.within) {
        continue;
      }

      if (!state.isApproachArmed(stateKey)) {
        continue;
      }

      state.markApproachFired(stateKey);
      hits.push({
        triggerId: 'fib_pivot_approach',
        triggerVersion: FIB_PIVOT_APPROACH_VERSION,
        kind: 'approach',
        levelName: level.name,
        levelValue: level.value,
        side: approachSide,
        price: ctx.price,
        previousPrice,
        periodId: ctx.levelSet.periodId,
        candleTimeStart: ctx.candleTimeStart,
        dedupeKey: buildTriggerDedupeKey({
          triggerId: 'fib_pivot_approach',
          instrumentUid: ctx.instrumentUid,
          timeframe: ctx.timeframe,
          periodId: ctx.levelSet.periodId,
          levelName: level.name,
          side: approachSide,
          candleTimeStart: ctx.candleTimeStart,
        }),
        features: {
          source: ctx.levelSet.source,
          evalMode: ctx.evalMode,
          timeframe: ctx.timeframe,
          approachPct: pct,
          ...(proximity.distancePct !== null ? { distancePct: proximity.distancePct } : {}),
        },
        reasons: [
          `Price approached Fibonacci ${level.name} from ${approachSide} within ${pct}% (level=${level.value}, price=${ctx.price})`,
        ],
      });
    }

    return hits;
  },
};
