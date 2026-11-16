import {
  type CanonicalStreamCandle,
  isStreamCandleInterval,
  type StreamCandleInterval,
} from '@moex/broker-tinvest';
import type { MarketDataProvider } from '@moex/contracts';
import { type CandleInterval, parseDecimalString, parseInstrumentId } from '@moex/domain';
import {
  adaptFibonacciPivotSet,
  analyzePriceAction,
  type BreakoutRetestState,
  buildAnalysisSnapshot,
  clusterPriceLevels,
  confirmSignal,
  type EngineCandle,
  type EngineInstrumentSpec,
  type EnginePivotSet,
  type EngineVolumeProfile,
  levelsFromVolumeProfile,
  TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION,
  type TradingSetup,
  updateBreakoutRetestSetup,
  updateTrendPullbackSetup,
} from '@moex/strategy-engine';
import { getFibonacciPivots } from '../market/fibonacci-pivot-service.js';
import { getHorizontalVolume } from '../market/horizontal-volume-service.js';
import type { ClosedBarEvaluator, LiveSignalCandidate } from './closed-bar-evaluator.js';
import type { AlertLevel, LevelAlert, LevelAlertEngine } from './level-alert-engine.js';

const CONFIG_VERSION = `live-tse-${TRADING_SIGNAL_ENGINE_ALGORITHM_VERSION}`;
const HISTORY_BARS = 200;

type PartitionKey = string;

type PartitionState = {
  candles: EngineCandle[];
  tickSize: string;
  instrument: EngineInstrumentSpec | null;
  setups: Map<string, TradingSetup>;
  breakoutState: Map<string, BreakoutRetestState>;
  warmed: boolean;
  atr: string | null;
};

function partitionKey(instrumentUid: string, interval: string): PartitionKey {
  return `${instrumentUid}:${interval}`;
}

function intervalMs(interval: StreamCandleInterval): number {
  if (interval === '1m') {
    return 60_000;
  }
  if (interval === '1h') {
    return 3_600_000;
  }
  return 300_000;
}

function toStreamInterval(interval: CandleInterval): StreamCandleInterval | null {
  if (isStreamCandleInterval(interval)) {
    return interval;
  }
  return null;
}

function toEngineCandle(
  candle: CanonicalStreamCandle,
  streamInterval: StreamCandleInterval,
  instrumentId: ReturnType<typeof parseInstrumentId>,
  status: 'OPEN' | 'CLOSED',
): EngineCandle {
  const timestamp = Date.parse(candle.timeStart);
  return {
    instrumentId,
    timeframe: streamInterval,
    timestamp,
    closeTimestamp: timestamp + intervalMs(streamInterval),
    open: parseDecimalString(candle.open),
    high: parseDecimalString(candle.high),
    low: parseDecimalString(candle.low),
    close: parseDecimalString(candle.close),
    volume: parseDecimalString(candle.volumeLots),
    status,
    revision: candle.revision,
    sourceEventId: candle.eventHash,
  };
}

function optionalDecimal(value: string | null): ReturnType<typeof parseDecimalString> | null {
  if (value === null) {
    return null;
  }
  return parseDecimalString(value);
}

function chartTimeframe(interval: StreamCandleInterval): '1m' | '5m' | '1h' {
  if (interval === '1m' || interval === '1h') {
    return interval;
  }
  return '5m';
}

export type LiveMarketAnalyzer = {
  evaluateLiveAlerts: (candle: CanonicalStreamCandle) => LevelAlert[] | Promise<LevelAlert[]>;
  evaluateClosedBar: ClosedBarEvaluator;
};

/**
 * Shared analysis cache: fib+VP levels for live alerts, TSE confirm on closed bars.
 */
export function createLiveMarketAnalyzer(input: {
  marketData: MarketDataProvider;
  levelAlerts: LevelAlertEngine;
}): LiveMarketAnalyzer {
  const partitions = new Map<PartitionKey, PartitionState>();
  let instrumentNames: Map<string, string> | null = null;

  const resolveInstrumentName = async (instrumentUid: string): Promise<string | null> => {
    if (instrumentNames === null) {
      instrumentNames = new Map();
      try {
        const catalog = await input.marketData.getInstrumentCatalog();
        for (const row of catalog) {
          instrumentNames.set(row.providerInstrumentId, row.name);
        }
      } catch {
        // Keep empty map; alerts still send with ticker only.
      }
    }
    return instrumentNames.get(instrumentUid) ?? null;
  };

  const getPartition = (instrumentUid: string, interval: StreamCandleInterval): PartitionState => {
    const key = partitionKey(instrumentUid, interval);
    const existing = partitions.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const created: PartitionState = {
      candles: [],
      tickSize: '0.01',
      instrument: null,
      setups: new Map(),
      breakoutState: new Map(),
      warmed: false,
      atr: null,
    };
    partitions.set(key, created);
    return created;
  };

  const refreshLevels = async (
    instrumentUid: string,
    interval: StreamCandleInterval,
    state: PartitionState,
    referencePrice: string,
  ): Promise<void> => {
    const now = new Date();
    const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const tf = chartTimeframe(interval);
    const alertLevels: AlertLevel[] = [];
    let atr = state.atr ?? state.tickSize;

    try {
      const pivots = await getFibonacciPivots(
        { marketData: input.marketData },
        { instrumentUid, chartTimeframe: tf, from, to: now },
      );
      const latest = pivots.periods[pivots.periods.length - 1];
      if (latest !== undefined) {
        const pivotAdapted = adaptFibonacciPivotSet({
          chartTimeframe: tf,
          sourceOHLC: {
            high: latest.sourcePeriod.high,
            low: latest.sourcePeriod.low,
            close: latest.sourcePeriod.close,
          },
          anchorStart: Date.parse(latest.sourcePeriod.start),
          anchorEnd: Date.parse(latest.sourcePeriod.end),
          calculationTimestamp: Date.now(),
          isComplete: true,
        });
        if (pivotAdapted.ok) {
          for (const level of pivotAdapted.pivotSet.levels) {
            alertLevels.push({
              id: `FIB:${level.id}`,
              price: String(level.price),
              sources: ['FIB_PIVOT'],
            });
          }
        } else {
          for (const [id, price] of Object.entries(latest.values)) {
            alertLevels.push({
              id: `FIB:${id.toUpperCase()}`,
              price,
              sources: ['FIB_PIVOT'],
            });
          }
        }
      }
    } catch {
      // Levels stay fib-empty; alerts may no-op until pivots available.
    }

    try {
      const vpFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const vp = await getHorizontalVolume(
        { marketData: input.marketData },
        { instrumentUid, chartTimeframe: tf, from: vpFrom, to: now },
      );
      atr = state.atr ?? vp.tickSize;
      const vpLevels = levelsFromVolumeProfile({
        poc: optionalDecimal(vp.poc),
        vah: optionalDecimal(vp.vah),
        val: optionalDecimal(vp.val),
        atr,
        tickSize: vp.tickSize,
        referencePrice,
        profileId: `${instrumentUid}:week`,
      });
      for (const level of vpLevels) {
        alertLevels.push({
          id: level.id,
          price: String(level.price),
          sources: ['VOLUME_PROFILE'],
        });
      }
    } catch {
      // VP optional for alerts.
    }

    if (alertLevels.length > 0) {
      input.levelAlerts.setLevels(instrumentUid, alertLevels, atr);
    }
  };

  const warm = async (
    instrumentUid: string,
    interval: StreamCandleInterval,
    state: PartitionState,
  ): Promise<void> => {
    if (state.warmed) {
      return;
    }
    const instrumentId = parseInstrumentId(instrumentUid);
    const to = new Date();
    const from = new Date(to.getTime() - HISTORY_BARS * intervalMs(interval));
    const [candlesResult, spec] = await Promise.all([
      input.marketData.getCandles({ instrumentId, interval, from, to }),
      input.marketData.getInstrumentSpec(instrumentUid),
    ]);
    state.tickSize = String(spec.minPriceIncrement);
    const pointValue =
      spec.minPriceIncrementAmount !== null && spec.minPriceIncrementAmount !== undefined
        ? String(spec.minPriceIncrementAmount)
        : String(spec.minPriceIncrement);
    state.instrument = {
      instrumentId,
      exchange: 'MOEX',
      tickSize: parseDecimalString(String(spec.minPriceIncrement)),
      lotSize: spec.lotSize,
      pointValue: parseDecimalString(pointValue),
      minQuantity: 1,
      quantityStep: 1,
      quoteCurrency: spec.priceCurrency,
      priceCurrency: spec.priceCurrency,
      tradingCalendarId: null,
      sessionProfile: 'SESSION_BASED',
    };

    state.candles = candlesResult.items
      .filter((candle) => candle.isClosed)
      .map((candle, index) => {
        const timestamp = Date.parse(candle.timeStart);
        return {
          instrumentId,
          timeframe: interval,
          timestamp,
          closeTimestamp: Date.parse(candle.timeEnd),
          open: parseDecimalString(String(candle.open)),
          high: parseDecimalString(String(candle.high)),
          low: parseDecimalString(String(candle.low)),
          close: parseDecimalString(String(candle.close)),
          volume: parseDecimalString(String(candle.volume)),
          status: 'CLOSED' as const,
          revision: index + 1,
          sourceEventId: `${instrumentUid}:${candle.timeStart}`,
        };
      })
      .sort((left, right) => left.timestamp - right.timestamp);

    const last = state.candles[state.candles.length - 1];
    await refreshLevels(instrumentUid, interval, state, last?.close ?? state.tickSize);
    state.warmed = true;
  };

  const evaluateLiveAlerts = async (candle: CanonicalStreamCandle): Promise<LevelAlert[]> => {
    if (candle.barState !== 'UPDATING') {
      return [];
    }
    const streamInterval = toStreamInterval(candle.interval);
    if (streamInterval === null) {
      return [];
    }
    const state = getPartition(candle.instrumentUid, streamInterval);
    try {
      await warm(candle.instrumentUid, streamInterval, state);
    } catch {
      return [];
    }
    const name = await resolveInstrumentName(candle.instrumentUid);
    return input.levelAlerts.evaluate({
      instrumentUid: candle.instrumentUid,
      ticker: candle.ticker,
      name,
      intervalCode: streamInterval,
      barTimeStart: candle.timeStart,
      price: candle.close,
      low: candle.low,
      high: candle.high,
      nowMs: Date.now(),
    });
  };

  const evaluateClosedBar: ClosedBarEvaluator = async (candle) => {
    if (candle.barState !== 'CLOSE_EMITTED' && candle.barState !== 'FINALIZED_BY_SCHEDULE') {
      return null;
    }
    const streamInterval = toStreamInterval(candle.interval);
    if (streamInterval === null) {
      return null;
    }
    const instrumentId = parseInstrumentId(candle.instrumentUid);
    const state = getPartition(candle.instrumentUid, streamInterval);
    try {
      await warm(candle.instrumentUid, streamInterval, state);
    } catch {
      return null;
    }

    const engineCandle = toEngineCandle(candle, streamInterval, instrumentId, 'CLOSED');
    const withoutSame = state.candles.filter((row) => row.timestamp !== engineCandle.timestamp);
    state.candles = [...withoutSame, engineCandle].sort((a, b) => a.timestamp - b.timestamp);
    if (state.candles.length > HISTORY_BARS) {
      state.candles = state.candles.slice(-HISTORY_BARS);
    }

    let pivotSet: EnginePivotSet | null = null;
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const pivots = await getFibonacciPivots(
        { marketData: input.marketData },
        {
          instrumentUid: candle.instrumentUid,
          chartTimeframe: chartTimeframe(streamInterval),
          from,
          to: now,
        },
      );
      const latest = pivots.periods[pivots.periods.length - 1];
      if (latest !== undefined) {
        const adapted = adaptFibonacciPivotSet({
          chartTimeframe: chartTimeframe(streamInterval),
          sourceOHLC: {
            high: latest.sourcePeriod.high,
            low: latest.sourcePeriod.low,
            close: latest.sourcePeriod.close,
          },
          anchorStart: Date.parse(latest.sourcePeriod.start),
          anchorEnd: Date.parse(latest.sourcePeriod.end),
          calculationTimestamp: engineCandle.closeTimestamp,
          isComplete: true,
        });
        if (adapted.ok) {
          pivotSet = adapted.pivotSet;
        }
      }
    } catch {
      pivotSet = null;
    }

    let volumeProfile: EngineVolumeProfile | null = null;
    let vpApproximate = false;
    try {
      const now = new Date();
      const vpFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const vp = await getHorizontalVolume(
        { marketData: input.marketData },
        {
          instrumentUid: candle.instrumentUid,
          chartTimeframe: chartTimeframe(streamInterval),
          from: vpFrom,
          to: now,
        },
      );
      volumeProfile = {
        scope: 'EXPLICIT_WINDOW',
        from: vpFrom.getTime(),
        to: now.getTime(),
        isDeveloping: false,
        qualityLabel: vp.quality === 'ok' ? 'EXACT' : 'APPROXIMATE',
        reasonCodes: [],
        algorithmId: vp.algorithm.id,
        algorithmVersion: vp.algorithm.version,
        poc: optionalDecimal(vp.poc),
        vah: optionalDecimal(vp.vah),
        val: optionalDecimal(vp.val),
        bins: vp.levels.map((level) => ({
          price: parseDecimalString(level.price),
          volume: parseDecimalString(level.volume),
          buyVolume: parseDecimalString(level.buyVolume),
          sellVolume: parseDecimalString(level.sellVolume),
        })),
        totalVolume: parseDecimalString(vp.totalVolume),
      };
      vpApproximate = vp.quality !== 'ok';
    } catch {
      volumeProfile = null;
    }

    const snapshot = buildAnalysisSnapshot({
      decisionTimestamp: engineCandle.closeTimestamp,
      setupCandles: state.candles,
      tickSize: state.tickSize,
      pivotSet,
      volumeProfile,
    });
    state.atr = snapshot.atr !== null ? String(snapshot.atr) : state.atr;

    await refreshLevels(candle.instrumentUid, streamInterval, state, String(engineCandle.close));

    if (snapshot.atr === null || snapshot.referenceCandle === null) {
      return null;
    }

    const fibLevels = snapshot.fibonacci.levels;
    const vpLevels =
      volumeProfile !== null
        ? levelsFromVolumeProfile({
            poc: volumeProfile.poc,
            vah: volumeProfile.vah,
            val: volumeProfile.val,
            atr: snapshot.atr,
            tickSize: state.tickSize,
            referencePrice: engineCandle.close,
            profileId: `${candle.instrumentUid}:week`,
          })
        : [];
    const zones = clusterPriceLevels(
      [...fibLevels, ...vpLevels],
      snapshot.atr,
      state.tickSize,
      engineCandle.closeTimestamp,
    );

    const requireSecondary = vpLevels.length > 0;
    const directions = ['LONG', 'SHORT'] as const;
    const triggered: TradingSetup[] = [];

    for (const direction of directions) {
      const existingKey = `TREND_PULLBACK:${direction}`;
      const existing = state.setups.get(existingKey) ?? null;
      const update = updateTrendPullbackSetup({
        instrumentId,
        setupTimeframe: streamInterval,
        direction,
        now: engineCandle.closeTimestamp,
        candles: state.candles,
        atr: snapshot.atr,
        tickSize: state.tickSize,
        marketStructure: snapshot.marketStructure,
        zones,
        existing,
        config: {
          requireFibMember: true,
          requireSecondaryFamily: requireSecondary,
        },
      });
      if (update !== null) {
        state.setups.set(existingKey, update.setup);
        if (update.setup.status === 'TRIGGERED') {
          triggered.push(update.setup);
        }
      }

      const boundary =
        direction === 'LONG'
          ? (snapshot.fibonacci.nearestAbove?.price ?? zones[0]?.high)
          : (snapshot.fibonacci.nearestBelow?.price ?? zones[0]?.low);
      if (boundary !== undefined) {
        const brKey = `BREAKOUT_RETEST:${direction}`;
        const brExisting = state.setups.get(brKey) ?? null;
        const prevState = state.breakoutState.get(brKey) ?? null;
        const br = updateBreakoutRetestSetup({
          instrumentId,
          setupTimeframe: streamInterval,
          direction,
          now: engineCandle.closeTimestamp,
          candles: state.candles,
          atr: snapshot.atr,
          tickSize: state.tickSize,
          boundary,
          existing: brExisting,
          state: prevState,
        });
        state.breakoutState.set(brKey, br.state);
        if (br.update !== null) {
          state.setups.set(brKey, br.update.setup);
          if (br.update.setup.status === 'TRIGGERED') {
            triggered.push(br.update.setup);
          }
        }
      }
    }

    const setup = triggered[0];
    if (setup === undefined) {
      return null;
    }

    const zone = zones.find((z) => z.id === setup.zoneId) ?? zones[0] ?? null;
    const priceAction = analyzePriceAction({
      candles: state.candles,
      zones: zone === null ? [] : [zone],
      tickSize: state.tickSize,
    });

    const instrument: EngineInstrumentSpec =
      state.instrument ??
      ({
        instrumentId,
        exchange: 'MOEX',
        tickSize: parseDecimalString(state.tickSize),
        lotSize: 1,
        pointValue: parseDecimalString(state.tickSize),
        minQuantity: 1,
        quantityStep: 1,
        quoteCurrency: 'RUB',
        priceCurrency: 'RUB',
        tradingCalendarId: null,
        sessionProfile: 'SESSION_BASED',
      } satisfies EngineInstrumentSpec);

    const decision = confirmSignal({
      strategy: setup.strategy,
      setup,
      marketStructure: snapshot.marketStructure,
      zone,
      priceAction,
      rvol: snapshot.candleFeatures?.relativeVolume ?? null,
      mtfAlignment: null,
      volumeProfileApproximate: vpApproximate || volumeProfile === null,
      structuralTargets: [...fibLevels, ...vpLevels],
      instrument,
      equity: '1000000',
      costPerUnit: '1',
      atr: snapshot.atr,
      confirmationClose: engineCandle.close,
      signalTimestamp: engineCandle.closeTimestamp,
      dataGates: {
        candleStale: false,
        hasGap: false,
        pivotAvailable: pivotSet !== null,
        volumeProfileAvailable: volumeProfile !== null,
        instrumentSpecAvailable: state.instrument !== null,
        eventOrderingTrusted: true,
        recoveringFromReplay: false,
      },
      duplicates: {
        hasDuplicateActiveSetup: false,
        hasOpenPositionForSymbol: false,
        cooldownActive: false,
      },
      configVersion: CONFIG_VERSION,
    });

    const direction =
      decision.direction === 'LONG' ? 'buy' : decision.direction === 'SHORT' ? 'sell' : 'hold';

    const candidate: LiveSignalCandidate = {
      instrumentUid: candle.instrumentUid,
      ticker: candle.ticker,
      intervalCode: streamInterval,
      eventKey: `tse:${setup.id}:${candle.eventHash}`,
      direction,
      status: decision.accepted ? 'accepted' : 'rejected',
      referencePrice: String(
        decision.entry.executionReferencePrice ?? decision.entry.signalReferencePrice,
      ),
      reasons: decision.reasonCodes,
      features: {
        strategy: setup.strategy,
        setupStatus: setup.status,
        score:
          decision.score.selectedDirection === 'LONG'
            ? decision.score.longScore
            : decision.score.shortScore,
        alertKind: 'entry_confirm',
        barState: candle.barState,
      },
      sourceEventTime: candle.timeStart,
    };
    return candidate;
  };

  return { evaluateLiveAlerts, evaluateClosedBar };
}
