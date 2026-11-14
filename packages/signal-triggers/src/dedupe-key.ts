import type { TriggerId, TriggerSide } from './types.js';

export function buildTriggerDedupeKey(input: {
  triggerId: TriggerId;
  instrumentUid: string;
  timeframe: string;
  periodId: string;
  levelName: string;
  side: TriggerSide;
  candleTimeStart: string;
}): string {
  return [
    input.triggerId,
    input.instrumentUid,
    input.timeframe,
    input.periodId,
    input.levelName,
    input.side,
    input.candleTimeStart,
  ].join(':');
}

export function buildApproachStateKey(input: {
  instrumentUid: string;
  timeframe: string;
  periodId: string;
  levelName: string;
  side: 'above' | 'below';
}): string {
  return [input.instrumentUid, input.timeframe, input.periodId, input.levelName, input.side].join(
    '|',
  );
}
