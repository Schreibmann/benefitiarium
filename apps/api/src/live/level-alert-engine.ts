import { compare, divide, subtract } from '@moex/decimal';
import { parseDecimalString } from '@moex/domain';

export type LevelAlertKind = 'APPROACH' | 'CROSS' | 'LEVEL_CONSOLIDATION';

export type AlertLevel = {
  id: string;
  price: string;
  sources: string[];
};

export type LevelAlert = {
  kind: LevelAlertKind;
  levelId: string;
  levelPrice: string;
  levelSources: string[];
  distanceAtr: string;
  instrumentUid: string;
  ticker: string | null;
  intervalCode: string;
  barTimeStart: string;
  referencePrice: string;
};

export type LevelAlertEngineConfig = {
  approachAtr: number;
  crossWindowMs: number;
  crossCountForChop: number;
  quietMs: number;
  dedupMs: number;
};

export const DEFAULT_LEVEL_ALERT_CONFIG: LevelAlertEngineConfig = {
  approachAtr: 0.15,
  crossWindowMs: 15 * 60_000,
  crossCountForChop: 3,
  quietMs: 15 * 60_000,
  dedupMs: 5 * 60_000,
};

type LevelSide = 'above' | 'below' | 'at';

type LevelRuntimeState = {
  lastSide: LevelSide | null;
  lastSpanned: boolean;
  crossTimestamps: number[];
  lastAlertAt: Partial<Record<LevelAlertKind, number>>;
  consolidationQuietUntil: number | null;
};

export type LevelAlertEngine = {
  setLevels: (instrumentUid: string, levels: readonly AlertLevel[], atr: string) => void;
  evaluate: (input: {
    instrumentUid: string;
    ticker: string | null;
    intervalCode: string;
    barTimeStart: string;
    price: string;
    low: string;
    high: string;
    nowMs: number;
  }) => LevelAlert[];
};

function absDistance(price: string, level: string): string {
  const delta = subtract(price, level);
  if (compare(delta, '0') < 0) {
    return subtract('0', delta);
  }
  return delta;
}

function normalizedDistanceAtr(price: string, level: string, atr: string): string {
  const atrValue = parseDecimalString(atr);
  if (compare(atrValue, '0') <= 0) {
    return '0';
  }
  return divide(absDistance(price, level), atrValue);
}

function sideOf(price: string, level: string): LevelSide {
  const cmp = compare(price, level);
  if (cmp > 0) {
    return 'above';
  }
  if (cmp < 0) {
    return 'below';
  }
  return 'at';
}

function barSpansLevel(low: string, high: string, level: string): boolean {
  return compare(low, level) <= 0 && compare(high, level) >= 0;
}

function detectCross(input: {
  lastSide: LevelSide | null;
  lastSpanned: boolean;
  currentSide: LevelSide;
  low: string;
  high: string;
  levelPrice: string;
}): boolean {
  if (input.lastSide === null) {
    return false;
  }
  if (
    input.lastSide !== 'at' &&
    input.currentSide !== 'at' &&
    input.currentSide !== input.lastSide
  ) {
    return true;
  }
  const spans = barSpansLevel(input.low, input.high, input.levelPrice);
  // Newly engulfing the level after a print that did not span it.
  return spans && !input.lastSpanned && input.lastSide !== 'at';
}

function pruneTimestamps(timestamps: number[], nowMs: number, windowMs: number): number[] {
  const start = nowMs - windowMs;
  return timestamps.filter((ts) => ts >= start);
}

function makeAlert(
  kind: LevelAlertKind,
  level: AlertLevel,
  distanceAtr: string,
  input: {
    instrumentUid: string;
    ticker: string | null;
    intervalCode: string;
    barTimeStart: string;
    price: string;
  },
): LevelAlert {
  return {
    kind,
    levelId: level.id,
    levelPrice: level.price,
    levelSources: [...level.sources],
    distanceAtr,
    instrumentUid: input.instrumentUid,
    ticker: input.ticker,
    intervalCode: input.intervalCode,
    barTimeStart: input.barTimeStart,
    referencePrice: input.price,
  };
}

/**
 * Live level alerts on the current (possibly unclosed) bar: approach, cross, consolidation.
 */
export function createLevelAlertEngine(
  config: Partial<LevelAlertEngineConfig> = {},
): LevelAlertEngine {
  const resolved: LevelAlertEngineConfig = {
    ...DEFAULT_LEVEL_ALERT_CONFIG,
    ...config,
  };

  const levelsByInstrument = new Map<string, AlertLevel[]>();
  const atrByInstrument = new Map<string, string>();
  const stateByKey = new Map<string, LevelRuntimeState>();

  const stateKey = (instrumentUid: string, levelId: string): string =>
    `${instrumentUid}:${levelId}`;

  const getState = (instrumentUid: string, levelId: string): LevelRuntimeState => {
    const key = stateKey(instrumentUid, levelId);
    const existing = stateByKey.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const created: LevelRuntimeState = {
      lastSide: null,
      lastSpanned: false,
      crossTimestamps: [],
      lastAlertAt: {},
      consolidationQuietUntil: null,
    };
    stateByKey.set(key, created);
    return created;
  };

  const canEmit = (state: LevelRuntimeState, kind: LevelAlertKind, nowMs: number): boolean => {
    const last = state.lastAlertAt[kind];
    if (last === undefined) {
      return true;
    }
    return nowMs - last >= resolved.dedupMs;
  };

  const markEmitted = (state: LevelRuntimeState, kind: LevelAlertKind, nowMs: number): void => {
    state.lastAlertAt[kind] = nowMs;
  };

  return {
    setLevels(instrumentUid, levels, atr) {
      levelsByInstrument.set(instrumentUid, [...levels]);
      atrByInstrument.set(instrumentUid, atr);
    },

    evaluate(input) {
      const levels = levelsByInstrument.get(input.instrumentUid) ?? [];
      const atr = atrByInstrument.get(input.instrumentUid);
      if (levels.length === 0 || atr === undefined) {
        return [];
      }

      const out: LevelAlert[] = [];

      for (const level of levels) {
        const state = getState(input.instrumentUid, level.id);
        const distanceAtr = normalizedDistanceAtr(input.price, level.price, atr);
        const currentSide = sideOf(input.price, level.price);
        const spans = barSpansLevel(input.low, input.high, level.price);
        const crossed = detectCross({
          lastSide: state.lastSide,
          lastSpanned: state.lastSpanned,
          currentSide,
          low: input.low,
          high: input.high,
          levelPrice: level.price,
        });

        const quietUntil = state.consolidationQuietUntil;
        const inQuiet = quietUntil !== null && input.nowMs < quietUntil;

        if (crossed) {
          state.crossTimestamps = pruneTimestamps(
            [...state.crossTimestamps, input.nowMs],
            input.nowMs,
            resolved.crossWindowMs,
          );
        } else {
          state.crossTimestamps = pruneTimestamps(
            state.crossTimestamps,
            input.nowMs,
            resolved.crossWindowMs,
          );
        }

        const crossCount = state.crossTimestamps.length;
        const chopReady =
          crossCount >= resolved.crossCountForChop &&
          (quietUntil === null || input.nowMs >= quietUntil);

        if (chopReady && canEmit(state, 'LEVEL_CONSOLIDATION', input.nowMs)) {
          out.push(makeAlert('LEVEL_CONSOLIDATION', level, distanceAtr, input));
          markEmitted(state, 'LEVEL_CONSOLIDATION', input.nowMs);
          state.consolidationQuietUntil = input.nowMs + resolved.quietMs;
          state.crossTimestamps = [];
        } else if (!inQuiet) {
          if (crossed && canEmit(state, 'CROSS', input.nowMs)) {
            out.push(makeAlert('CROSS', level, distanceAtr, input));
            markEmitted(state, 'CROSS', input.nowMs);
          } else if (!crossed) {
            const distanceNum = Number(distanceAtr);
            const approaching = Number.isFinite(distanceNum) && distanceNum <= resolved.approachAtr;
            const lastCross = state.lastAlertAt.CROSS;
            const recentCross =
              lastCross !== undefined && input.nowMs - lastCross < resolved.dedupMs;
            if (approaching && !recentCross && canEmit(state, 'APPROACH', input.nowMs)) {
              out.push(makeAlert('APPROACH', level, distanceAtr, input));
              markEmitted(state, 'APPROACH', input.nowMs);
            }
          }
        }

        state.lastSide = currentSide;
        state.lastSpanned = spans;
      }

      return out;
    },
  };
}
