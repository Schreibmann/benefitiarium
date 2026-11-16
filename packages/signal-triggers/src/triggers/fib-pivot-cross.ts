import { buildTriggerDedupeKey } from '../dedupe-key.js';
import { crossedDown, crossedUp } from '../level-math.js';
import type { Trigger, TriggerHit } from '../types.js';

export const FIB_PIVOT_CROSS_VERSION = '1.0.0' as const;

export const fibPivotCrossTrigger: Trigger = {
  id: 'fib_pivot_cross',
  version: FIB_PIVOT_CROSS_VERSION,
  evaluate(ctx) {
    if (ctx.levelSet.quality === 'DEGENERATE_RANGE') {
      return [];
    }
    const previousPrice = ctx.previousPrice;
    if (previousPrice === null) {
      return [];
    }

    const hits: TriggerHit[] = [];
    for (const level of ctx.levelSet.levels) {
      let side: 'up' | 'down' | null = null;
      if (crossedUp(previousPrice, ctx.price, level.value)) {
        side = 'up';
      } else if (crossedDown(previousPrice, ctx.price, level.value)) {
        side = 'down';
      }
      if (side === null) {
        continue;
      }

      hits.push({
        triggerId: 'fib_pivot_cross',
        triggerVersion: FIB_PIVOT_CROSS_VERSION,
        kind: 'cross',
        levelName: level.name,
        levelValue: level.value,
        side,
        price: ctx.price,
        previousPrice,
        periodId: ctx.levelSet.periodId,
        candleTimeStart: ctx.candleTimeStart,
        dedupeKey: buildTriggerDedupeKey({
          triggerId: 'fib_pivot_cross',
          instrumentUid: ctx.instrumentUid,
          timeframe: ctx.timeframe,
          periodId: ctx.levelSet.periodId,
          levelName: level.name,
          side,
          candleTimeStart: ctx.candleTimeStart,
        }),
        features: {
          source: ctx.levelSet.source,
          evalMode: ctx.evalMode,
          timeframe: ctx.timeframe,
        },
        reasons: [
          `Price crossed Fibonacci ${level.name} ${side} at ${level.value} (prev=${previousPrice}, price=${ctx.price})`,
        ],
      });
    }
    return hits;
  },
};
