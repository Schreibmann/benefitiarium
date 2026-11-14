import type { StreamCandleInterval } from '@moex/broker-tinvest';
import { isStreamCandleInterval } from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import type { EvalMode, SignalTimeframe, TriggerId } from '@moex/signal-triggers';

const SIGNAL_TIMEFRAMES = new Set<SignalTimeframe>(['5m', '1h']);
const TRIGGER_IDS = new Set<TriggerId>(['fib_pivot_approach', 'fib_pivot_cross']);

export type SignalsWorkerConfig = {
  timeframes: SignalTimeframe[];
  streamIntervals: StreamCandleInterval[];
  evalMode: EvalMode;
  triggers: TriggerId[];
  approachPctByTimeframe: { '5m': string; '1h': string };
  favoritesPollMs: number;
  telegramChannelId: string | null;
  waitingClose: boolean;
};

function splitCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseTimeframes(raw: string): SignalTimeframe[] {
  const values = splitCsv(raw);
  if (values.length === 0) {
    throw new Error('SIGNALS_TIMEFRAMES must list at least one timeframe');
  }
  const result: SignalTimeframe[] = [];
  for (const value of values) {
    if (value !== '5m' && value !== '1h') {
      throw new Error(`Unsupported SIGNALS_TIMEFRAMES entry: ${value}`);
    }
    if (!SIGNAL_TIMEFRAMES.has(value)) {
      throw new Error(`Unsupported SIGNALS_TIMEFRAMES entry: ${value}`);
    }
    if (!result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

function parseTriggers(raw: string): TriggerId[] {
  const values = splitCsv(raw);
  if (values.length === 0) {
    throw new Error('SIGNALS_TRIGGERS must list at least one trigger id');
  }
  const result: TriggerId[] = [];
  for (const value of values) {
    if (value !== 'fib_pivot_approach' && value !== 'fib_pivot_cross') {
      throw new Error(`Unsupported SIGNALS_TRIGGERS entry: ${value}`);
    }
    if (!TRIGGER_IDS.has(value)) {
      throw new Error(`Unsupported SIGNALS_TRIGGERS entry: ${value}`);
    }
    if (!result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

export function parseSignalsWorkerConfig(env: AppEnv): SignalsWorkerConfig {
  const timeframes = parseTimeframes(env.SIGNALS_TIMEFRAMES);
  const streamIntervals: StreamCandleInterval[] = [];
  for (const timeframe of timeframes) {
    if (!isStreamCandleInterval(timeframe)) {
      throw new Error(`Timeframe is not streamable: ${timeframe}`);
    }
    streamIntervals.push(timeframe);
  }

  const channel = env.TELEGRAM_CHANNEL_ID.trim();
  return {
    timeframes,
    streamIntervals,
    evalMode: env.SIGNALS_EVAL_MODE,
    triggers: parseTriggers(env.SIGNALS_TRIGGERS),
    approachPctByTimeframe: {
      '5m': env.SIGNALS_APPROACH_PCT_5M.trim(),
      '1h': env.SIGNALS_APPROACH_PCT_1H.trim(),
    },
    favoritesPollMs: env.SIGNALS_FAVORITES_POLL_MS,
    telegramChannelId: channel.length > 0 ? channel : null,
    waitingClose: env.SIGNALS_EVAL_MODE === 'close',
  };
}
