# BENEFITIARIUM — Technical Specification: Trading Signal Engine

**Document ID:** `BENEFITIARIUM-TRADING-SIGNAL-ENGINE`  
**Version:** `1.0.0`  
**Date:** `2026-11-15`  
**Status:** Proposed implementation specification  
**Audience:** AI coding agent, backend engineers, quantitative developers, QA  
**Primary language:** TypeScript  
**Execution mode for initial release:** Live analysis + signal generation + paper trading; real order execution is out of scope until separately approved and validated.

---

## 0. Instructions to the implementation agent

Implement the system described in this document as a deterministic, testable trading-analysis subsystem. Do not implement a monolithic indicator or put the entire algorithm in a single stream callback.

### Normative terms

- **MUST / MUST NOT** — mandatory requirement.
- **SHOULD / SHOULD NOT** — recommended unless a documented reason prevents it.
- **MAY** — optional extension.

### Agent execution rules

1. Inspect the existing BENEFITIARIUM repository before changing code. Reuse existing market-data types, candle streams, Fibonacci Pivot Points calculations, horizontal-volume calculations, persistence conventions, event bus, logging, and configuration patterns where they already exist.
2. Do not create a second implementation of a calculation that already exists and has passing tests. Wrap it with an adapter if the contract differs.
3. Do not silently change the existing Fibonacci Pivot Points formula. First identify its exact formula and test fixtures, then expose it through the adapter specified below.
4. Keep Fibonacci Pivot Points and Fibonacci Retracement as separate concepts and separate data types. Never treat one as the other.
5. Do not invent Volume Delta, buyer/seller aggressor classification, or trade-level volume when the source data does not provide it.
6. All calculations must be deterministic for the same ordered input events and configuration.
7. All timestamps must be exchange/event timestamps in UTC internally. Exchange timezone and session calendar are explicit configuration, not implicit server-local time.
8. No strategy may use information that was not available at the signal timestamp. This applies to Live mode, replay, backtesting, and tests.
9. Start with signal generation and paper trading. Do not place real orders or claim that a signal has a known probability of profit.
10. Add unit tests, integration tests, replay tests, and acceptance tests alongside implementation. Do not postpone tests until the end.

---

## 1. Purpose and scope

### 1.1. Goal

Build an explainable `Trading Signal Engine` that continuously analyses existing BENEFITIARIUM market data:

- Live OHLCV candle stream;
- existing Fibonacci Pivot Points levels;
- horizontal Volume Profile data;
- derived market structure and price-action features;
- configurable multi-timeframe context.

The engine must generate lifecycle events such as:

- `SETUP_APPROACHING`;
- `SETUP_FORMING`;
- `SIGNAL_CANDIDATE`;
- `SIGNAL_CONFIRMED`;
- `SIGNAL_INVALIDATED`;
- `SIGNAL_EXPIRED`;
- `POSITION_OPENED` (paper-trading adapter only in the initial release);
- `POSITION_UPDATED`;
- `POSITION_EXIT_CANDIDATE`;
- `POSITION_CLOSED`.

Each confirmed signal must be explainable: the system must persist the strategy, market regime, feature values, score contribution, entry reference, invalidation level, stop, target candidates, risk estimate, and the exact data versions used for the decision.

### 1.2. Non-goals for the first release

The first release MUST NOT:

- promise or imply profitability;
- execute real broker orders;
- use a neural network or LLM to decide entries/exits;
- infer buyer/seller aggression from candle direction;
- use a developing, unclosed candle as a confirmed candle;
- recalculate historical decisions using future data;
- automatically optimise strategy parameters against the same data used to report performance;
- treat the signal score as a probability of success;
- mix Fibonacci Pivot Points with Fibonacci Retracement calculations.

### 1.3. Initial strategy scope

Implement the strategy framework for four setup families, but enable only the first two by default:

| Strategy ID       | Strategy            |      Initial status | Main idea                                                                                  |
| ----------------- | ------------------- | ------------------: | ------------------------------------------------------------------------------------------ |
| `TREND_PULLBACK`  | Trend pullback      |             Enabled | Enter a retracement/pullback in a structurally confirmed trend near a confluence zone      |
| `BREAKOUT_RETEST` | Breakout and retest |             Enabled | Enter after a confirmed break of a meaningful range/value boundary and a successful retest |
| `FAILED_BREAKOUT` | Failed breakout     | Disabled by default | Enter after price rejects an attempted auction beyond a key boundary and returns inside    |
| `RANGE_REVERSAL`  | Range reversal      | Disabled by default | Trade a confirmed range boundary back toward the value area/POC                            |

A strategy can only be enabled after its own backtest and paper-trading acceptance criteria pass.

---

## 2. Domain terminology and critical distinction: Fibonacci methods

BENEFITIARIUM has an existing Fibonacci Pivot Points feature with the selected automatic mapping:

| Analysis/chart timeframe | Pivot anchor period |
| ------------------------ | ------------------- |
| `5m`                     | `1D`                |
| `1h`                     | `1W`                |

Preserve this mapping as the default configuration unless repository inspection reveals that the existing implementation encodes it differently. The table means that a 5-minute analysis uses the daily Fibonacci Pivot Points set, while a 1-hour analysis uses the weekly set.

### 2.1. Fibonacci Pivot Points

Pivot Points are precomputed reference levels for an anchor period. The engine consumes the existing BENEFITIARIUM calculation through an adapter. The exact mathematical variant MUST be taken from the existing implementation and validated with fixtures. There are several Fibonacci Pivot Point conventions; do not replace the project's current convention with a guessed formula.

The adapter must expose:

- pivot method/version;
- anchor period (`1D`, `1W`, etc.);
- anchor start/end timestamps;
- source OHLC values used for calculation;
- calculation timestamp;
- pivot level identifiers and exact prices;
- whether the level set is complete/final.

### 2.2. Fibonacci Retracement / Extension

Fibonacci Retracement is a separate optional feature based on a confirmed swing impulse (swing low to swing high or vice versa). It is not the same as Pivot Points.

It MAY be implemented as a later confluence source if the product already needs it. If implemented, keep its `method` and source swing identifiers explicit. Do not substitute retracement levels for the existing Pivot Points levels.

### 2.3. Level role is contextual

A level named `R1` or `S1` is not an unconditional guarantee of resistance or support. Its role must be derived from price location, approach direction, prior acceptance/rejection, and the selected strategy. Store raw level identity separately from the engine's contextual classification (`SUPPORT_CANDIDATE`, `RESISTANCE_CANDIDATE`, `BROKEN_LEVEL`, `NEUTRAL`).

---

## 3. High-level architecture

```text
Exchange / Broker Stream
        |
        v
Market Data Adapters
        |
        +--> Candle Normalizer / Candle Store
        +--> Fibonacci Pivot Adapter (existing implementation)
        +--> Volume Profile Adapter (existing implementation)
        |
        v
Per-Symbol / Per-Timeframe Analysis Pipeline
        |
        +--> Data Quality & Session Context
        +--> Volatility Features (TR / ATR)
        +--> Market Structure Analyzer
        +--> Candle / Price Action Analyzer
        +--> Fibonacci Level Analyzer
        +--> Volume Profile Analyzer
        +--> Multi-Timeframe Context
        |
        v
Confluence Engine
        |
        v
Strategy Setup Detectors
        |
        v
Signal Scoring + Hard Risk / Eligibility Gates
        |
        v
Signal Lifecycle Manager
        |
        +--> Signal Repository
        +--> Event Publisher / UI Feed
        +--> Backtest / Replay Recorder
        |
        v
Trade Management (paper position state)
        |
        +--> Stop / Target / Trailing Logic
        +--> Exit Conditions
        +--> Performance & Evals
```

### 3.1. Architectural rules

- Analysis modules MUST be pure functions where possible: input snapshot + config -> output features.
- I/O, stream subscription, persistence, and event publishing belong in orchestration/adapters, not in mathematical modules.
- Process each `(symbol, timeframe)` partition in deterministic event order.
- A higher-timeframe context provider may be shared, but must expose only information available at the decision timestamp.
- Strategy modules MUST NOT independently recalculate ATR, pivots, or volume profiles. They consume normalized analysis snapshots.
- Signal scoring MUST NOT execute trades. Trade management MUST NOT change the historical signal score.
- UI/chart code (including TanStack Charts) is a consumer of analysis and signal events; it MUST NOT be a dependency of the trading engine.

---

## 4. Input data contracts

The following interfaces are target contracts. Adapt names to existing repository conventions, but preserve semantics.

```ts
export type Direction = 'LONG' | 'SHORT';
export type Timeframe =
  | '1m'
  | '3m'
  | '5m'
  | '10m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '1D'
  | '1W';

export type CandleStatus = 'OPEN' | 'CLOSED' | 'CORRECTED';

export interface Candle {
  symbol: string;
  timeframe: Timeframe;
  timestamp: number; // UTC epoch milliseconds: candle open time
  closeTimestamp: number; // UTC epoch milliseconds: expected candle close time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  status: CandleStatus;
  revision: number; // monotonically increasing per candle key
  sourceEventId: string;
}

export interface InstrumentSpec {
  symbol: string;
  exchange: string;
  tickSize: number;
  lotSize: number;
  pointValue: number; // monetary value of one price unit per contract/share
  minQuantity: number;
  quantityStep: number;
  quoteCurrency: string;
  priceCurrency: string;
  tradingCalendarId: string;
  sessionProfile: 'CONTINUOUS' | 'SESSION_BASED' | 'CUSTOM';
}

export interface MarketEvent {
  eventId: string;
  sequence?: number; // exchange/provider sequence when available
  receivedAt: number; // UTC epoch ms
  eventTimestamp: number; // UTC epoch ms
  kind: 'CANDLE_UPDATE' | 'CANDLE_CLOSED' | 'CANDLE_CORRECTED';
  candle: Candle;
}
```

### 4.1. Data validation

Before analysis, validate:

- all OHLCV values are finite;
- `high >= max(open, close, low)`;
- `low <= min(open, close, high)`;
- `volume >= 0`;
- `tickSize > 0`, `lotSize > 0`, `pointValue > 0`;
- candle timestamp aligns with configured timeframe boundaries, allowing explicitly configured exchange exceptions;
- `closeTimestamp > timestamp`;
- no duplicate event is applied more than once;
- revisions are monotonic for the same `(symbol, timeframe, timestamp)` key.

A candle failing validation MUST be quarantined and MUST NOT be used to generate a confirmed signal. Emit a structured data-quality event with a reason code.

### 4.2. Candle state and corrections

An open candle can be updated many times. The current state is the latest revision. A closed candle is immutable for normal processing. If a provider sends an explicit correction after closure:

1. persist the correction and its revision;
2. identify the earliest affected feature checkpoint;
3. replay affected analysis from that point;
4. preserve previously published decisions as historical facts;
5. publish a `DATA_CORRECTION` event and, if necessary, a corrected analytical state;
6. never silently retract a historical signal without an auditable correction event.

---

## 5. Fibonacci Pivot Points adapter

### 5.1. Contract

```ts
export type PivotLevelId = 'P' | 'R1' | 'R2' | 'R3' | 'R4' | 'S1' | 'S2' | 'S3' | 'S4' | string;

export interface FibonacciPivotLevel {
  id: PivotLevelId;
  price: number;
  side?: 'ABOVE_PIVOT' | 'BELOW_PIVOT' | 'CENTRAL';
}

export interface FibonacciPivotSet {
  id: string;
  symbol: string;
  method: string; // exact existing formula identifier/version
  analysisTimeframe: Timeframe;
  anchorTimeframe: Timeframe; // default mapping 5m -> 1D, 1h -> 1W
  anchorStart: number;
  anchorEnd: number;
  sourceOpen: number;
  sourceHigh: number;
  sourceLow: number;
  sourceClose: number;
  calculatedAt: number;
  isFinal: boolean;
  levels: FibonacciPivotLevel[];
}

export interface FibonacciPivotProvider {
  getPivotSet(
    symbol: string,
    analysisTimeframe: Timeframe,
    asOf: number,
  ): Promise<FibonacciPivotSet | null>;
}
```

### 5.2. Default mapping configuration

```ts
export const DEFAULT_FIBONACCI_PIVOT_MAPPING = {
  '5m': '1D',
  '1h': '1W',
} as const;
```

The mapping is configurable. For other timeframes, do not guess an anchor period; require an explicit mapping or return `UNSUPPORTED_PIVOT_MAPPING`.

### 5.3. Correctness requirements

- Pivot levels used for a decision MUST have been calculable at that decision timestamp.
- For daily pivots, the provider must use the correct completed daily reference period according to the existing BENEFITIARIUM convention.
- For weekly pivots, the provider must use the correct completed weekly reference period.
- `method` and source OHLC must be recorded with each signal.
- Tests MUST compare adapter output against the existing pivot calculation fixtures, including boundary dates, weekend/session transitions, and missing reference candles.
- The adapter MUST NOT recalculate the pivot formula independently unless the current repository implementation is being deliberately refactored with equivalence tests.

---

## 6. Volume Profile adapter and analyzer

### 6.1. Contract

```ts
export type VolumeProfileScope = 'CURRENT_SESSION' | 'PREVIOUS_SESSION' | 'ROLLING' | 'ANCHORED';

export interface VolumeAtPriceBin {
  priceLow: number;
  priceHigh: number;
  volume: number;
  buyVolume?: number; // only when directly supplied by trustworthy source data
  sellVolume?: number; // only when directly supplied by trustworthy source data
}

export interface VolumeProfile {
  id: string;
  symbol: string;
  scope: VolumeProfileScope;
  startTimestamp: number;
  endTimestamp: number;
  calculatedAt: number;
  isDeveloping: boolean;
  source: 'TRADE_LEVEL' | 'EXCHANGE_PROFILE' | 'CANDLE_ESTIMATE';
  priceStep: number;
  totalVolume: number;
  bins: VolumeAtPriceBin[];
  poc: number | null;
  vah: number | null;
  val: number | null;
  valueAreaPercent: number;
}

export interface VolumeProfileSnapshot {
  profiles: VolumeProfile[];
  available: boolean;
  quality: 'EXACT' | 'APPROXIMATE' | 'INSUFFICIENT';
  warnings: string[];
}
```

### 6.2. Profile sources and quality

Use the best available source in this order:

1. Trade-level or exchange-provided volume-at-price data (`EXACT`).
2. Existing BENEFITIARIUM volume profile output if its methodology and inputs are known (`EXACT` or `APPROXIMATE`, as appropriate).
3. OHLCV candle-based volume allocation (`APPROXIMATE`).

If using candle-based allocation, the implementation MUST document the allocation method (e.g. uniform distribution over intersected price bins, close-weighted approximation, or the existing product method). It MUST NOT label estimated volume as trade-level volume. `buyVolume`, `sellVolume`, and Volume Delta MUST remain unavailable unless source data explicitly supports them.

### 6.3. POC calculation

For bins `i` with volume `V_i`:

\[
POC = midpoint(priceBin_k),\quad k = argmax_i(V_i)
\]

Tie-break deterministically: choose the bin closest to the profile's volume-weighted mean price; if still tied, choose the lower price bin. Record the tie-break result for reproducibility.

### 6.4. Value Area calculation

Default `valueAreaPercent = 0.70`.

1. Start from the POC bin.
2. Compare the next adjacent bin above and below the current value-area boundary.
3. Add the higher-volume adjacent bin.
4. Repeat until cumulative included volume reaches or exceeds 70% of total profile volume.
5. On equal adjacent volumes, use a deterministic tie-break (include the side whose next bin is closer to POC; then lower price).
6. `VAL` is the lower included boundary; `VAH` is the upper included boundary.

The implementation must use contiguous bins around POC, not simply choose the highest-volume 70% of non-contiguous bins.

### 6.5. HVN / LVN detection

HVN and LVN extraction is configurable and should be implemented only if the existing profile module does not already provide stable node detection.

Recommended initial method:

- smooth bin volumes with a small configurable moving-average kernel;
- identify local maxima as HVN candidates and local minima as LVN candidates;
- require prominence relative to a local neighborhood;
- merge adjacent candidate bins into zones;
- express node strength relative to profile median volume or local distribution;
- store price range, prominence, source profile, and node classification.

Do not hard-code one absolute volume threshold across instruments. Use relative thresholds. The precise detector is a tunable component and MUST be evaluated separately.

```ts
export interface VolumeNode {
  id: string;
  kind: 'HVN' | 'LVN';
  low: number;
  high: number;
  center: number;
  strength: number; // normalized 0..1
  sourceProfileId: string;
}
```

### 6.6. Developing versus completed profile

- A developing current-session profile MAY support `SETUP_APPROACHING` and candidate updates.
- Confirmed signals MUST record whether each used profile was developing or completed.
- A profile update must not mutate the historical profile snapshot attached to an already-confirmed signal.
- Previous-session profiles are immutable after session finalization except explicit provider corrections.

---

## 7. Shared mathematical features

All price-distance calculations must account for `tickSize` and volatility. Do not use instrument-specific hard-coded absolute distances.

### 7.1. True Range and ATR

For candle `t`:

\[
TR_t = max(H_t-L_t, |H_t-C_{t-1}|, |L_t-C_{t-1}|)
\]

Wilder ATR with period `n`:

- Initial ATR: arithmetic mean of the first `n` valid TR values.
- Subsequent value:

\[
ATR_t = \frac{(n-1)ATR_{t-1}+TR_t}{n}
\]

Default `n = 14`. Only closed candles update confirmed ATR. A separate live ATR estimate may be exposed for UI/candidate logic, but it must not replace confirmed ATR in a confirmed signal.

### 7.2. Candle features

For candle `t`, let `range = high - low`.

```ts
export interface CandleFeatures {
  body: number;
  range: number;
  bodyRatio: number; // 0..1
  upperWick: number;
  lowerWick: number;
  closeLocation: number; // 0..1, 1 = close at high
  isBullish: boolean;
  isBearish: boolean;
  isDoji: boolean;
  relativeVolume: number | null;
}
```

\[
BodyRatio = \frac{|C-O|}{H-L}
\]

\[
UpperWick = H-max(O,C),\quad LowerWick=min(O,C)-L
\]

\[
CloseLocation = \frac{C-L}{H-L}
\]

When `H == L`, use `bodyRatio = 0`, `closeLocation = 0.5`, and emit a flat-candle flag. Never divide by zero.

### 7.3. Relative volume (RVOL)

Preferred method: compare a closed candle with the median volume for the same instrument, timeframe, session phase/time bucket, using prior completed sessions only.

Fallback method when session history is insufficient:

\[
RVOL_t = \frac{Volume_t}{median(Volume_{t-n},\ldots,Volume_{t-1})}
\]

Default fallback `n = 20` closed candles. The current candle is excluded from the baseline. If the baseline is zero or insufficient, RVOL is `null`, not infinity.

Initial configurable buckets for fallback RVOL:

|         RVOL | Raw volume evidence |
| -----------: | ------------------: |
|     `< 0.70` |                0.00 |
| `0.70–<1.00` |                0.20 |
| `1.00–<1.20` |                0.40 |
| `1.20–<1.50` |                0.67 |
|    `>= 1.50` |                1.00 |

This is a starting mapping for score normalization, not a universal market law. It must be calibrated per market/session using historical data.

### 7.4. Normalized distance

For a price `p` and level `l`:

\[
DistanceNorm(p,l)=\frac{|p-l|}{max(ATR, TickSize)}
\]

For zone `[zLow,zHigh]`, distance is zero when `p` is inside the zone; otherwise use distance to the nearest boundary divided by `max(ATR, TickSize)`.

### 7.5. Tick rounding

All derived order/reference prices must be rounded to a valid tick. Use an explicit rounding policy:

- LONG stop: round down to valid tick;
- SHORT stop: round up to valid tick;
- LONG limit target: round up/down according to order intent and venue rules; encode this in the execution adapter, not a generic Math.round;
- never round in a way that accidentally moves a protective stop closer to the market than calculated.

---

## 8. Market Structure Analyzer

### 8.1. Purpose

Determine confirmed swing points, trend direction, structural breaks, range state, and transition state.

### 8.2. Swing point detection

Use a deterministic confirmed-pivot algorithm as the initial implementation:

- configurable `leftBars = 2`, `rightBars = 2`;
- a swing high is a candle whose high is strictly greater than the highs of the `leftBars` preceding candles and greater than or equal to the highs of the `rightBars` following candles, subject to deterministic equal-high tie handling;
- a swing low is symmetric;
- a swing cannot be confirmed until all `rightBars` candles have closed;
- apply a minimum prominence filter: movement away from the candidate extreme must be at least `max(minProminenceTicks * tickSize, atrMultiple * ATR)`;
- defaults for initial test only: `minProminenceTicks = 4`, `atrMultiple = 0.5`.

If the existing project already uses a ZigZag/ATR swing algorithm, provide an adapter rather than introducing conflicting swing definitions. The chosen method and version must be recorded.

```ts
export interface SwingPoint {
  id: string;
  kind: 'HIGH' | 'LOW';
  price: number;
  candleTimestamp: number;
  confirmedAt: number;
  confirmationBars: number;
  prominence: number;
  method: string;
}
```

### 8.3. Structure labels

- `HH`: current confirmed swing high > previous confirmed swing high by at least minimum structural distance.
- `LH`: current confirmed swing high < previous confirmed swing high by at least minimum structural distance.
- `HL`: current confirmed swing low > previous confirmed swing low by at least minimum structural distance.
- `LL`: current confirmed swing low < previous confirmed swing low by at least minimum structural distance.
- Comparisons within the structural tolerance are `EQUAL`/neutral rather than forced into HH/LH/HL/LL.

A bullish structural sequence requires a confirmed HH and HL in a valid alternating sequence. A bearish sequence requires LH and LL.

### 8.4. Break of Structure (BOS)

A BOS occurs only when a closed candle closes beyond the relevant confirmed swing level by a configurable buffer:

\[
BOSBuffer=max(2\cdot TickSize, 0.05\cdot ATR)
\]

A wick beyond a level without a close beyond it is a sweep/rejection candidate, not a confirmed BOS.

### 8.5. Market regime output

```ts
export type MarketRegime = 'BULLISH_TREND' | 'BEARISH_TREND' | 'RANGE' | 'TRANSITION' | 'UNKNOWN';

export interface MarketStructureSnapshot {
  regime: MarketRegime;
  confidence: number; // structural classification strength 0..1, not win probability
  swings: SwingPoint[];
  lastHigherHigh?: SwingPoint;
  lastHigherLow?: SwingPoint;
  lastLowerHigh?: SwingPoint;
  lastLowerLow?: SwingPoint;
  lastBullishBosAt?: number;
  lastBearishBosAt?: number;
  rangeHigh?: number;
  rangeLow?: number;
  rangePoc?: number;
  reasonCodes: string[];
}
```

### 8.6. Regime classification and hysteresis

Initial deterministic rules:

**BULLISH_TREND**

- valid confirmed HH + HL sequence exists;
- latest protected HL has not been invalidated by a confirmed close below its level minus BOS buffer;
- a bullish BOS or continuation sequence is recent enough according to `structureLookbackBars`.

**BEARISH_TREND**

- symmetric LH + LL sequence;
- latest protected LH has not been invalidated by a confirmed close above its level plus BOS buffer.

**RANGE**

- no valid trend sequence dominates;
- price has repeatedly crossed/returned to the profile value area or a defined consolidation range;
- at least `minBoundaryTouches` confirmed tests of both boundaries within `rangeLookbackBars`;
- range width is larger than a minimum tick threshold and not expanding as a directional trend.

**TRANSITION**

- former trend's protected structure was broken, but an opposite trend is not yet confirmed;
- or range breakout is underway but no accepted post-break structure exists.

**UNKNOWN**

- insufficient data or invalid inputs.

Use hysteresis: a new regime must satisfy its entry conditions for a configurable number of confirmed updates. A single noisy candle must not flip the regime. Defaults: `regimeConfirmBars = 2`; immediate transition to `TRANSITION` is permitted when a protected structural level is conclusively broken.

Do not use a developing candle to confirm regime changes.

---

## 9. Fibonacci level analyzer

### 9.1. Inputs

- Pivot set from Section 5;
- current confirmed price/candle;
- ATR and tick size;
- optional retracement level set if a separate retracement provider exists.

### 9.2. Output

```ts
export interface AnalyzedPriceLevel {
  id: string;
  source: 'FIB_PIVOT' | 'FIB_RETRACEMENT' | 'VOLUME_PROFILE' | 'SWING';
  sourceId: string;
  price: number;
  zoneLow: number;
  zoneHigh: number;
  distanceAtr: number;
  contextualRole: 'SUPPORT_CANDIDATE' | 'RESISTANCE_CANDIDATE' | 'BROKEN_LEVEL' | 'NEUTRAL';
  isConfirmed: boolean;
}

export interface FibonacciAnalysis {
  pivotSetId?: string;
  method?: string;
  levels: AnalyzedPriceLevel[];
  nearestAbove?: AnalyzedPriceLevel;
  nearestBelow?: AnalyzedPriceLevel;
  dataAvailable: boolean;
  warnings: string[];
}
```

### 9.3. Zone width

For a pivot level `L`, initial tolerance:

\[
Tolerance=max(2\cdot TickSize, k_{zone}\cdot ATR)
\]

Initial `k_zone = 0.10`, configurable per instrument/timeframe. A level zone is `[L - Tolerance, L + Tolerance]`.

Do not create overlapping duplicate zones from several levels in the same pivot set without clustering. Preserve the original level IDs after clustering.

### 9.4. Contextual level classification

A level can become a support/resistance candidate only when there is evidence from price interaction:

- support candidate: price approaches from above and shows a confirmed hold/reclaim;
- resistance candidate: price approaches from below and shows a confirmed rejection;
- broken level: price closes beyond it by the configured buffer and remains accepted beyond it, or a confirmed retest changes its role;
- neutral: no sufficient interaction evidence.

Do not permanently label pivot R/S levels as support/resistance only from their names.

---

## 10. Confluence Engine

### 10.1. Purpose

Cluster nearby levels from genuinely distinct source families into a confluence zone. The engine must prevent double-counting correlated representations of the same underlying data.

### 10.2. Inputs

- Fibonacci Pivot Points levels;
- optional Fibonacci Retracement levels;
- POC/VAH/VAL;
- HVN/LVN zones;
- confirmed swing levels;
- ATR and tick size.

### 10.3. Clustering

Two levels may belong to the same cluster if the gap between their zones is no more than:

\[
ClusterGap=max(2\cdot TickSize, k_{cluster}\cdot ATR)
\]

Initial `k_cluster = 0.10`.

Use a deterministic 1D clustering procedure (sorted intervals + merge adjacent intervals). Do not use random clustering. Store all member levels and their origins.

### 10.4. Independence groups

For scoring, count at most one strongest contribution per evidence family:

- `FIBONACCI`: Pivot Points and Retracement are separate raw sources, but may be correlated. By default, score the strongest one and add only a small configurable bonus for cross-method confluence.
- `VOLUME_PROFILE`: POC inside HVN or VA boundaries from the same profile are one profile-family contribution, not three independent confirmations.
- `STRUCTURE`: swing point and BOS from the same structural event must not be counted twice as independent evidence.
- `PRICE_ACTION`: candle pattern and close location from the same candle are related; cap the combined contribution.

```ts
export interface ConfluenceZone {
  id: string;
  low: number;
  high: number;
  center: number;
  members: AnalyzedPriceLevel[];
  familyCount: number;
  familyStrength: Record<string, number>;
  overallStrength: number; // normalized 0..1; not probability
  createdAt: number;
  invalidatedAt?: number;
}
```

### 10.5. Strength calculation

Use normalized family strengths, not raw number of lines. Initial formula:

\[
ZoneStrength = 1 - \prod_{f \in Families}(1 - w_f \cdot s_f)
\]

where `s_f` is the capped 0..1 strength for family `f`, and `w_f` is its configured family coefficient. Clamp result to `[0,1]`.

This formula is only a ranking score. It is not a statistical probability.

---

## 11. Price Action Analyzer

### 11.1. Purpose

Detect closed-candle evidence around a pre-existing level/zone. It must not create a trade setup from a candle pattern in the middle of nowhere.

### 11.2. Initial patterns

Implement a small deterministic set first:

1. Bullish/bearish engulfing (body-based, with configurable strictness).
2. Rejection candle / long wick at a zone.
3. Strong close through a level (breakout close).
4. Inside-bar compression followed by confirmed directional break (optional, after base tests).
5. Reclaim/rejection: candle trades through a level but closes back on the expected side.

Each pattern returns:

```ts
export interface PriceActionEvidence {
  pattern: string;
  direction: Direction | 'NEUTRAL';
  candleTimestamp: number;
  zoneId?: string;
  strength: number; // 0..1
  features: Record<string, number | boolean | string>;
  confirmed: boolean;
}
```

### 11.3. Minimum requirements for rejection evidence

For a bullish rejection at support:

- candle low intersects or penetrates the support zone;
- candle closes above the zone's relevant boundary or reclaims the level;
- close location is in the upper part of the candle range (initial threshold `>= 0.65`);
- lower wick is meaningful relative to body/range (initial threshold configurable, e.g. `lowerWick / max(range, tickSize) >= 0.35`);
- pattern is evaluated only after candle close for confirmation.

For bearish rejection, mirror the conditions.

### 11.4. No pattern overfitting

Keep pattern definitions few and explicit. Do not create dozens of named candle patterns without separate evidence that they improve out-of-sample results.

---

## 12. Multi-Timeframe Context

### 12.1. Roles

Use configurable timeframe roles:

- `CONTEXT_TF`: higher timeframe for broad regime/structure;
- `SETUP_TF`: timeframe on which a strategy setup is detected;
- `ENTRY_TF`: timeframe for entry confirmation.

Initial example configuration (not mandatory for all instruments):

```ts
{
  contextTimeframe: "1D",
  setupTimeframe: "1h",
  entryTimeframe: "5m"
}
```

The existing Fibonacci Pivot mapping remains separate:

- 5m analysis -> daily pivot set;
- 1h analysis -> weekly pivot set.

Do not infer that pivot anchor period and MTF context timeframe must always be the same thing.

### 12.2. As-of rule

At decision timestamp `T`, only use higher-timeframe candles whose `closeTimestamp <= T` and which were received/known by `T`. If the current 1D candle is still open, its final high/low/close must not be used as confirmed context.

### 12.3. Alignment score

Initial directional alignment:

- context + setup timeframe aligned with trade direction: full score;
- context aligned, setup neutral: partial score;
- context neutral, setup aligned: lower partial score;
- context opposed: zero or hard block depending on strategy configuration;
- missing or stale higher-timeframe data: `MTF_UNAVAILABLE`, no confirmed signal unless strategy explicitly allows a lower score with sufficient coverage.

For `RANGE_REVERSAL`, range-context alignment is evaluated differently: the strategy is eligible only when the relevant range regime is confirmed and price is near the corresponding boundary.

---

## 13. Strategy Setup Detectors

Each strategy is a stateful detector. It creates a setup object, updates it on new data, and emits explicit invalidation/expiry reasons. It does not place orders.

### 13.1. Shared setup contract

```ts
export type StrategyId =
  | 'TREND_PULLBACK'
  | 'BREAKOUT_RETEST'
  | 'FAILED_BREAKOUT'
  | 'RANGE_REVERSAL';

export type SetupStatus =
  | 'WATCHING'
  | 'APPROACHING'
  | 'FORMING'
  | 'TRIGGERED'
  | 'INVALIDATED'
  | 'EXPIRED';

export interface TradingSetup {
  id: string;
  symbol: string;
  strategy: StrategyId;
  direction: Direction;
  setupTimeframe: Timeframe;
  createdAt: number;
  updatedAt: number;
  status: SetupStatus;
  zoneId?: string;
  triggerLevel?: number;
  invalidationLevel?: number;
  referenceSwingIds: string[];
  referenceProfileIds: string[];
  referencePivotSetIds: string[];
  reasonCodes: string[];
  expiresAt?: number;
}
```

### 13.2. Strategy A — TREND_PULLBACK

**Purpose:** enter a correction in the direction of a confirmed trend.

**LONG eligibility:**

1. Market regime on setup timeframe is `BULLISH_TREND`.
2. Context timeframe is bullish or neutral according to config; default: opposing context blocks entry.
3. Price pulls back toward a valid confluence zone containing at least one Fibonacci Pivot Point level or another explicitly enabled Fibonacci source.
4. The zone is supported by a distinct volume-profile or structure family where data is available.
5. Price action shows a confirmed bullish rejection/reclaim or a local bullish structure break.
6. The latest protected HL has not been broken.

**SHORT:** symmetric in `BEARISH_TREND`.

**Do not trigger:**

- in `TRANSITION`, `UNKNOWN`, or an opposing trend;
- after the zone is invalidated by a confirmed close beyond the structural invalidation level;
- if price has already moved too far from the zone (`maxChaseDistanceAtr`, initial 0.5 ATR);
- if the resulting stop distance violates configured minimum/maximum limits;
- if risk/reward to the nearest valid target is below the configured minimum.

**Trigger:** after a closed entry-timeframe candle confirms direction. The signal reference price is the close of the confirmation candle; the executable reference must be obtained from the next quote/available execution price, not assumed equal to the candle close.

### 13.3. Strategy B — BREAKOUT_RETEST

**Purpose:** enter after price leaves an established value/range boundary and proves acceptance beyond it through a retest.

**LONG sequence:**

1. A valid range/value boundary exists (e.g. VAH, confirmed range high, or a relevant pivot level).
2. A closed candle closes above the boundary plus breakout buffer.
3. Breakout volume evidence is adequate (RVOL threshold configurable; default candidate `>= 1.2`).
4. A retest occurs within `retestWindowBars` (initial 1–10 entry-TF closed bars).
5. Retest does not close back below the boundary beyond invalidation buffer.
6. A bullish confirmation candle closes after the retest.

**SHORT:** symmetric below VAL/range low/pivot support.

**Invalidation:** confirmed close back inside the prior range beyond the configured tolerance, or timeout before retest confirmation.

Do not chase an extended breakout if price distance from boundary exceeds `maxBreakoutExtensionAtr` (initial 1.0 ATR).

### 13.4. Strategy C — FAILED_BREAKOUT (disabled by default)

**Purpose:** identify rejection after a breakout attempt fails to gain acceptance beyond a meaningful boundary.

**SHORT sequence:**

1. Price trades above VAH/range high/pivot resistance.
2. A closed candle returns below the boundary (failed acceptance).
3. Close location and/or upper-wick evidence supports rejection.
4. Optional volume evidence confirms activity; high volume alone is not directional proof.
5. Next candle or local structure provides bearish confirmation.

**LONG:** symmetric below VAL/range low.

Only enable after dedicated validation. Avoid treating every wick beyond a level as a failed breakout.

### 13.5. Strategy D — RANGE_REVERSAL (disabled by default)

**Purpose:** fade a confirmed range edge back toward POC/value area.

**LONG:**

1. `RANGE` regime confirmed.
2. Price near VAL or lower range boundary.
3. Support confluence present (HVN, pivot level, swing support, or equivalent).
4. Confirmed bullish rejection/reclaim.
5. A valid target toward POC or internal value boundary exists with acceptable reward/risk.

**SHORT:** symmetric at VAH/upper boundary.

Do not open range reversal trades in the central range area. Do not enable this strategy during a transition or fresh breakout.

---

## 14. Signal Scoring Engine

### 14.1. Principles

- Score is a deterministic ranking of evidence quality, not a probability.
- Calculate separate `longScore` and `shortScore`.
- Each category is normalized to `[0,1]` before applying weights.
- Cap contributions from correlated features within the same evidence family.
- Keep raw values, normalized values, weights, and final contributions for explainability.
- Hard gates are applied after scoring; a high score cannot override invalid data, broken structure, risk limits, or an ineligible strategy.

### 14.2. Initial weights

| Category                         |  Weight |
| -------------------------------- | ------: |
| Market regime / strategy context |      15 |
| Fibonacci confluence             |      15 |
| Volume Profile confluence        |      20 |
| Price Action                     |      20 |
| Volume confirmation              |      15 |
| Multi-Timeframe alignment        |      15 |
| **Total**                        | **100** |

The range strategy may use a strategy-specific regime mapping. The weight set is versioned and configurable.

### 14.3. Formula

Let `x_i` be normalized category evidence in `[0,1]`, `w_i` the category weight, and `A` the set of available categories.

\[
Coverage = \frac{\sum_{i\in A} w_i}{\sum_i w_i}
\]

\[
Score = 100 \cdot \frac{\sum_{i\in A} w_i x_i}{\sum_{i\in A} w_i}
\]

The score is valid only if:

- required categories for the strategy are available;
- `Coverage >= minScoreCoverage` (default 0.80);
- all hard gates pass.

If a mandatory input is unavailable, do not silently renormalize the score to 100. Return `NOT_SCORABLE` or `NO_TRADE` with reason codes.

### 14.4. Category normalization

Initial baseline (tunable; must be calibrated by backtest):

**Market regime (15 points)**

- aligned confirmed trend: 1.0;
- valid range for range strategy: 1.0;
- neutral but permitted: 0.35–0.50;
- transition/unknown/opposing regime: 0 or hard block according to strategy.

**Fibonacci (15 points)**

- price interacts with a configured high-priority pivot/confluence zone: 0.7;
- price interacts with a lower-priority relevant pivot zone: 0.4;
- multiple distinct Fibonacci methods agree in one cluster: add a capped bonus, maximum category value remains 1.0;
- no relevant Fibonacci level: 0.

**Volume Profile (20 points)**

- distinct profile-family evidence supports the setup (e.g. completed-profile POC/HVN or VA boundary with valid role): 0.6–0.8;
- developing profile agrees but completed profile does not: lower value, e.g. 0.3–0.5;
- LVN supports a breakout path: score only for breakout strategy and only if the level is accepted;
- missing profile: unavailable; approximate profile must be marked and may have a configurable score cap.

**Price Action (20 points)**

- confirmed rejection/reclaim or breakout-retest confirmation: 1.0;
- one strong directional close without full structure confirmation: 0.5–0.7;
- weak/ambiguous candle: 0–0.25;
- no confirmation: 0 and strategy may remain candidate only.

**Volume (15 points)**

Use session-normalized RVOL mapping from Section 7.3. Directional volume is not inferred from candle color. If trustworthy aggressor data exists, it may be an additional input, with independent validation and a cap.

**MTF (15 points)**

- context and setup timeframe aligned: 1.0;
- context aligned, setup neutral: 0.65;
- context neutral, setup aligned: 0.50;
- context opposed: 0 or hard block;
- unavailable: missing category; respect coverage rule.

### 14.5. Decision thresholds

Initial thresholds:

|      Score | Classification | Meaning                                            |
| ---------: | -------------- | -------------------------------------------------- |
|     `< 60` | `NO_SIGNAL`    | Insufficient evidence                              |
| `60–74.99` | `WATCH`        | Candidate worth monitoring; no entry               |
| `75–84.99` | `CONFIRMED`    | Potential entry if all hard gates pass             |
|    `>= 85` | `STRONG`       | Stronger evidence alignment, not a win probability |

For a confirmed directional signal, additionally require:

- strategy setup is triggered;
- `abs(longScore - shortScore) >= minDirectionalScoreGap` (default 15);
- strategy-specific mandatory evidence passes;
- risk/reward and position-size validation pass;
- no duplicate active signal for the same setup;
- no active conflicting position, unless explicitly supported by a hedging model (out of scope initially).

### 14.6. Result contract

```ts
export interface ScoreContribution {
  category: string;
  rawValue: number | null;
  normalizedValue: number | null;
  weight: number;
  contribution: number;
  available: boolean;
  reasonCodes: string[];
}

export interface SignalScore {
  longScore: number | null;
  shortScore: number | null;
  longCoverage: number;
  shortCoverage: number;
  contributions: {
    long: ScoreContribution[];
    short: ScoreContribution[];
  };
  classification: 'NO_SIGNAL' | 'WATCH' | 'CONFIRMED' | 'STRONG' | 'NOT_SCORABLE';
  configVersion: string;
}
```

---

## 15. Hard eligibility and risk gates

The following checks are independent of the score. A high score MUST NOT bypass them.

### 15.1. Data gates

Block new confirmed signal if:

- candle data is stale beyond configured threshold;
- current/required timeframe has a gap that invalidates features;
- pivot set is unavailable or stale for the selected mapping;
- required volume profile is unavailable/insufficient;
- instrument specification is missing;
- event ordering cannot be trusted;
- analysis state is recovering from a replay/correction and not yet consistent.

### 15.2. Market gates

Block if:

- strategy is not eligible for current market regime;
- entry is too far from setup zone;
- setup expired or invalidated;
- price has already reached the planned target before executable entry;
- spread/market-quality input, if available, exceeds configured maximum;
- session is closed or new-entry policy prohibits the current phase.

### 15.3. Risk/reward gate

Calculate reward/risk using executable reference prices and costs, not idealized candle close prices.

\[
RiskPerUnit = |Entry - Stop| \cdot PointValue + EstimatedRoundTripCostsPerUnit
\]

\[
RewardPerUnit = |Target_1 - Entry| \cdot PointValue - EstimatedRoundTripCostsPerUnit
\]

\[
RR = \frac{RewardPerUnit}{RiskPerUnit}
\]

Initial `minRewardRisk = 1.5`; configurable. If reward is non-positive, reject the signal.

### 15.4. Duplicate and cooldown gates

- One active setup per `(symbol, strategy, direction, setup timeframe, zone)` by default.
- One active paper position per symbol by default.
- Cooldown begins after setup invalidation or position close; initial default `cooldownBars = 3` on entry timeframe.
- A new setup may be created during cooldown only if it has a distinct setup identity and the policy allows it.

---

## 16. Entry, Stop Loss, Take Profit, and position sizing

### 16.1. Entry reference

A confirmed signal is emitted after the confirming candle closes. Store:

- `signalReferencePrice`: confirmation candle close;
- `signalTimestamp`: close timestamp;
- `executionReferencePrice`: first valid quote/trade after signal time, if available;
- `actualPaperFillPrice`: fill simulator result.

Never assume the confirmation candle close was an executable fill in historical simulation.

### 16.2. Structural Stop Loss

LONG stop candidate:

\[
SL_{raw}=InvalidationLow-Buffer
\]

SHORT stop candidate:

\[
SL_{raw}=InvalidationHigh+Buffer
\]

Initial buffer:

\[
Buffer=max(2\cdot TickSize, 0.15\cdot ATR)
\]

The invalidation level is normally the relevant protected swing or far boundary of the confluence zone, depending on strategy. Strategy must explicitly identify the invalidation source.

Reject if stop distance is below `minStopDistanceTicks` or above `maxStopDistanceAtr` (initial test defaults: at least 2 ticks; no more than 3 ATR). These are safeguards to test, not universal market constants.

### 16.3. Take Profit candidates

Candidate sources:

- next opposing/target-side POC or value boundary;
- next HVN/LVN transition where relevant;
- confirmed swing high/low;
- Fibonacci Pivot levels in the trade direction;
- optional Fibonacci Extension if provider exists;
- fixed R multiples as fallback/benchmark.

The target selector must:

1. discard targets on the wrong side of entry;
2. discard invalid/stale levels;
3. rank remaining targets by strategy relevance and distance;
4. ensure TP1 satisfies minimum reward/risk;
5. prefer a structural target before arbitrary fixed-R target when quality is comparable;
6. return a reason for selected and rejected candidates.

Do not assume that POC is always a target in trend continuation. Target role depends on current profile location and market regime.

### 16.4. Partial exits and trailing

Expose policy as configuration. Initial paper-trading defaults:

- TP1: close 40% of initial quantity;
- TP2: close 30% of initial quantity;
- remaining 30%: trail or close at TP3/exit condition;
- after price reaches +1R, allow break-even stop adjustment after accounting for fees and estimated slippage;
- trail LONG below the latest confirmed HL minus buffer;
- trail SHORT above the latest confirmed LH plus buffer.

Quantities must respect lot size and quantity step. Reconcile rounding so total closed quantity never exceeds the open quantity. If a partial quantity is below minimum lot, skip that partial exit and document the reason.

A stop may only move in the protective direction. It MUST NOT widen the original risk.

### 16.5. Position sizing

Let:

- `equity` = current paper account equity;
- `riskFraction` = allowed fraction of equity;
- `entry`, `stop` = executable price estimates;
- `pointValue` = monetary value per one price unit per contract;
- `costPerUnit` = estimated round-trip commission + slippage per unit.

\[
RiskBudget = Equity \cdot RiskFraction
\]

\[
RiskPerUnit = |Entry-Stop|\cdot PointValue + CostPerUnit
\]

\[
RawQuantity = \frac{RiskBudget}{RiskPerUnit}
\]

Round quantity down to `quantityStep`, then ensure it is >= `minQuantity` and conforms to lot constraints. If the rounded quantity is zero, reject the trade.

Initial paper defaults:

```ts
{
  riskPerTradePct: 0.005,       // 0.5% of equity
  maxRiskPerTradePct: 0.01,    // hard cap 1.0%
  maxDailyLossPct: 0.02,       // 2.0%, configurable
  maxConsecutiveLosses: 3,
  maxOpenPositionsPerSymbol: 1
}
```

Daily loss and consecutive-loss rules must use realized P&L plus configured treatment of open risk. Reset daily limits according to the exchange trading calendar, not UTC midnight by default.

---

## 17. Exit and trade management engine

### 17.1. Exit reasons

```ts
export type ExitReason =
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'STRUCTURE_INVALIDATED'
  | 'OPPOSITE_CONFIRMED_SIGNAL'
  | 'PROFILE_ACCEPTANCE_REVERSED'
  | 'TIME_STOP'
  | 'RISK_LIMIT'
  | 'SESSION_POLICY'
  | 'MANUAL_PAPER_CLOSE';
```

### 17.2. Exit conditions

The manager evaluates:

1. Hard stop hit (highest priority in intrabar simulator).
2. Target hit / partial exit.
3. Trailing stop update/hit.
4. Structural invalidation confirmed on closed candle.
5. Opposite confirmed signal for the same instrument.
6. Profile acceptance/level-role reversal, if strategy uses it.
7. Time stop: position has not progressed after configured bars/time.
8. Daily risk or session policy.

A single weak opposite score or a regime transition alone should not automatically close a position unless a strategy configuration explicitly requires it. Distinguish `EXIT_WARNING` from `EXIT_REQUIRED`.

### 17.3. Intrabar ambiguity

When OHLCV bars show both stop and target within the same bar and no tick-level sequence is available, backtesting MUST use a conservative assumption: stop is hit first. If tick/trade replay is available, use its chronological ordering.

### 17.4. Position state

```ts
export type PositionStatus = 'PENDING_ENTRY' | 'OPEN' | 'PARTIALLY_CLOSED' | 'CLOSED' | 'CANCELLED';

export interface TradingPosition {
  id: string;
  signalId: string;
  symbol: string;
  direction: Direction;
  status: PositionStatus;
  openedAt?: number;
  closedAt?: number;
  averageEntryPrice?: number;
  initialQuantity: number;
  openQuantity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  initialStop: number;
  currentStop: number;
  targets: number[];
  reachedTargets: number[];
  exitReason?: ExitReason;
  feesPaid: number;
  slippagePaid: number;
}
```

---

## 18. Signal and setup lifecycle

### 18.1. Signal states

```ts
export type SignalStatus =
  | 'APPROACHING'
  | 'FORMING'
  | 'CANDIDATE'
  | 'CONFIRMED'
  | 'EXECUTED'
  | 'EXPIRED'
  | 'INVALIDATED'
  | 'CANCELLED';
```

### 18.2. Allowed transitions

```text
APPROACHING -> FORMING -> CANDIDATE -> CONFIRMED -> EXECUTED
       |           |          |            |
       +-----------+----------+------------+--> INVALIDATED
       +-----------+----------+------------+--> EXPIRED
       +-----------+----------+------------+--> CANCELLED

CONFIRMED -> EXPIRED (entry window elapsed)
CONFIRMED -> CANCELLED (risk/data/session gate fails before entry)
EXECUTED -> position lifecycle takes over; signal remains historically immutable
```

Forbidden transitions include:

- `INVALIDATED -> CONFIRMED` for the same signal ID;
- `EXPIRED -> EXECUTED`;
- `CANCELLED -> EXECUTED`;
- any status regression caused only by a lower score update.

If conditions recur later, create a new setup/signal ID with a new trigger timestamp.

### 18.3. Lifecycle event contract

```ts
export interface SignalEvent {
  id: string;
  signalId: string;
  eventType:
    | 'SETUP_APPROACHING'
    | 'SETUP_FORMING'
    | 'SIGNAL_CANDIDATE'
    | 'SIGNAL_CONFIRMED'
    | 'SIGNAL_INVALIDATED'
    | 'SIGNAL_EXPIRED'
    | 'SIGNAL_CANCELLED'
    | 'POSITION_OPENED'
    | 'POSITION_UPDATED'
    | 'POSITION_EXIT_WARNING'
    | 'POSITION_CLOSED';
  symbol: string;
  timeframe: Timeframe;
  strategy: StrategyId;
  direction: Direction;
  timestamp: number;
  status: SignalStatus | PositionStatus;
  score?: SignalScore;
  payload: Record<string, unknown>;
  reasonCodes: string[];
  deduplicationKey: string;
  algorithmVersion: string;
  configVersion: string;
}
```

---

## 19. Live event processing and reliability

### 19.1. Processing modes

**Live candidate mode** (open candle updates):

- update live price, volume, developing profile, and approach distance;
- emit `APPROACHING`, `FORMING`, or `CANDIDATE` updates;
- no confirmed candle patterns, confirmed swing points, or confirmed BOS based on an open candle;
- do not persist each tick as a new historical signal; update the current candidate state.

**Confirmed mode** (closed candle):

- finalize candle features;
- update ATR and confirmed structure;
- update applicable level/profile snapshots;
- evaluate setups and scoring;
- apply all hard gates;
- emit a confirmed signal only once per setup/trigger.

### 19.2. Processing pseudocode

```ts
async function processMarketEvent(event: MarketEvent): Promise<void> {
  const key = `${event.candle.symbol}:${event.candle.timeframe}`;
  await partitionLock.run(key, async () => {
    if (await eventStore.isProcessed(event.eventId)) return;

    const instrument = await instrumentRepository.get(event.candle.symbol);
    const state = await analysisStateRepository.loadOrCreate(key);

    const validation = validateMarketEvent(event, instrument, state);
    if (!validation.ok) {
      await quarantineRepository.save(event, validation.reasonCodes);
      await eventPublisher.publishDataQualityEvent(event, validation.reasonCodes);
      return;
    }

    applyCandleRevision(state, event);

    // Corrections are not new market decisions. Rebuild affected state from
    // the earliest corrected candle and publish auditable correction events.
    if (event.kind === 'CANDLE_CORRECTED' || event.candle.status === 'CORRECTED') {
      await correctionReplayCoordinator.replayFrom({
        symbol: event.candle.symbol,
        timeframe: event.candle.timeframe,
        candleTimestamp: event.candle.timestamp,
        correctionEventId: event.eventId,
      });
      await eventStore.markProcessed(event.eventId);
      return;
    }

    const liveSnapshot = calculateLiveSnapshot(state, instrument, event.eventTimestamp);
    const candidateEvents = updateCandidateSetups(liveSnapshot, state);
    await persistAndPublish(candidateEvents);

    if (event.kind === 'CANDLE_UPDATE' || event.candle.status === 'OPEN') {
      await analysisStateRepository.save(state);
      await eventStore.markProcessed(event.eventId);
      return;
    }

    const confirmedSnapshot = calculateConfirmedSnapshot(state, instrument, event.eventTimestamp);

    const setups = evaluateEnabledStrategies(confirmedSnapshot, state);
    const evaluated = setups.map((setup) => scoreSetup(setup, confirmedSnapshot));
    const decisions = evaluated.map((result) => applyEligibilityAndRiskGates(result));

    const lifecycleEvents = updateSignalLifecycle(decisions, state);
    const positionEvents = managePaperPositions(confirmedSnapshot, state);

    await transaction(async (tx) => {
      await tx.analysisState.save(state);
      await tx.signals.upsert(lifecycleEvents);
      await tx.positions.upsert(positionEvents.positions);
      await tx.outbox.append([...lifecycleEvents, ...positionEvents.events]);
      await tx.processedEvents.mark(event.eventId);
    });
  });
}
```

The pseudocode is illustrative. Use the repository's actual transaction and locking model. An outbox pattern is recommended so persisted state and published events cannot drift after partial failures.

### 19.3. Ordering, idempotency, and replay

- Prefer exchange/provider sequence numbers when available.
- Otherwise order by event timestamp, candle timestamp, revision, then deterministic event ID.
- Keep a deduplication store for processed `eventId` values.
- Deduplication key for a signal should include symbol, strategy, direction, setup ID, trigger candle timestamp, and algorithm version.
- Late events must be detected. If they affect confirmed historical bars, schedule deterministic replay from the earliest affected dependency.
- Store periodic state checkpoints to avoid replaying the entire dataset.
- Recovery after restart must produce the same state and event sequence as uninterrupted processing.

### 19.4. Scalability

- Partition by symbol/timeframe or a stable symbol shard.
- Keep per-partition state local to the processing actor where possible.
- Recalculate only changed features and their dependents.
- Do not reload full history on every tick.
- Use bounded rolling windows for indicator calculations; persist swing/profile summaries separately.
- Measure event lag, processing duration, queue depth, dropped/late events, replay duration, and per-symbol CPU/memory.

---

## 20. Persistence model

Names may be adapted to the existing database technology. Logical entities are required.

### 20.1. Required records

**`analysis_snapshots`**

- symbol, timeframe, asOf timestamp;
- latest closed candle timestamp/revision;
- regime, ATR, swing summary;
- pivot set IDs;
- volume profile IDs;
- feature values;
- algorithm/config versions.

**`confluence_zones`**

- zone ID, symbol, timeframe;
- low/high/center;
- member level references;
- family strengths;
- created/invalidated timestamps;
- calculation version.

**`trading_setups`**

- setup ID, strategy, direction;
- status, timestamps, expiry;
- zone, trigger, invalidation;
- references to swings, profiles, pivot sets;
- reason codes and config version.

**`trading_signals`**

- signal ID, setup ID, strategy, direction;
- status and lifecycle timestamps;
- long/short score and coverage;
- score contributions;
- reference entry, stop, targets, RR;
- full feature snapshot or immutable snapshot reference;
- algorithm and config versions.

**`paper_positions`**

- position ID, signal ID;
- quantity, average entry, stop, targets;
- partial fills/exits;
- fees, slippage, realized/unrealized P&L;
- exit reason and timestamps.

**`trade_evaluations`**

- signal/position ID;
- MFE, MAE, R result, net P&L;
- time in trade;
- target/stop ordering;
- evaluation quality flags.

**`processed_market_events`**

- event ID, sequence, timestamps, candle key, revision, processing status.

### 20.2. Immutability and auditability

- Confirmed signal decision snapshots MUST be immutable.
- Corrections are appended as new records/events, not destructive rewrites.
- Every output must include `algorithmVersion` and `configVersion`.
- Persist raw feature inputs or immutable references sufficient to reproduce the decision.
- Store reason codes in machine-readable form; human-readable explanations are derived from reason codes and feature values.

---

## 21. Configuration

All strategy and threshold values must be versioned configuration, not magic numbers scattered across code.

### 21.1. Example configuration

```ts
export interface TradingEngineConfig {
  version: string;
  enabled: boolean;
  mode: 'LIVE_ANALYSIS' | 'PAPER_TRADING';
  timeframes: {
    context: Timeframe;
    setup: Timeframe;
    entry: Timeframe;
  };
  fibonacciPivots: {
    enabled: boolean;
    mapping: Partial<Record<Timeframe, Timeframe>>;
    zoneAtrMultiple: number;
    minTickTolerance: number;
  };
  atr: { period: number };
  structure: {
    leftBars: number;
    rightBars: number;
    minProminenceTicks: number;
    minProminenceAtr: number;
    bosBufferAtr: number;
    regimeConfirmBars: number;
    structureLookbackBars: number;
  };
  volumeProfile: {
    enabled: boolean;
    valueAreaPercent: number;
    maxApproximateScoreCap: number;
    hvnProminence: number;
    lvnProminence: number;
  };
  confluence: {
    clusterGapAtr: number;
    minDistinctFamilies: number;
  };
  scoring: {
    weights: {
      regime: number;
      fibonacci: number;
      volumeProfile: number;
      priceAction: number;
      volume: number;
      multiTimeframe: number;
    };
    minCoverage: number;
    watchThreshold: number;
    confirmedThreshold: number;
    strongThreshold: number;
    minDirectionalGap: number;
  };
  strategies: Record<
    StrategyId,
    {
      enabled: boolean;
      maxChaseDistanceAtr: number;
      expiryBars: number;
      minRewardRisk: number;
    }
  >;
  risk: {
    riskPerTradePct: number;
    maxRiskPerTradePct: number;
    maxDailyLossPct: number;
    maxConsecutiveLosses: number;
    maxOpenPositionsPerSymbol: number;
    minStopDistanceTicks: number;
    maxStopDistanceAtr: number;
    estimatedSlippageTicks: number;
    commissionPerUnitRoundTrip: number;
  };
  lifecycle: {
    cooldownBars: number;
    candidateUpdateThrottleMs: number;
  };
}
```

### 21.2. Default configuration for first paper-trading iteration

```ts
export const DEFAULT_TRADING_ENGINE_CONFIG: TradingEngineConfig = {
  version: '1.0.0',
  enabled: true,
  mode: 'PAPER_TRADING',
  timeframes: {
    context: '1D',
    setup: '1h',
    entry: '5m',
  },
  fibonacciPivots: {
    enabled: true,
    mapping: { '5m': '1D', '1h': '1W' },
    zoneAtrMultiple: 0.1,
    minTickTolerance: 2,
  },
  atr: { period: 14 },
  structure: {
    leftBars: 2,
    rightBars: 2,
    minProminenceTicks: 4,
    minProminenceAtr: 0.5,
    bosBufferAtr: 0.05,
    regimeConfirmBars: 2,
    structureLookbackBars: 80,
  },
  volumeProfile: {
    enabled: true,
    valueAreaPercent: 0.7,
    maxApproximateScoreCap: 0.6,
    hvnProminence: 0.2,
    lvnProminence: 0.2,
  },
  confluence: {
    clusterGapAtr: 0.1,
    minDistinctFamilies: 2,
  },
  scoring: {
    weights: {
      regime: 15,
      fibonacci: 15,
      volumeProfile: 20,
      priceAction: 20,
      volume: 15,
      multiTimeframe: 15,
    },
    minCoverage: 0.8,
    watchThreshold: 60,
    confirmedThreshold: 75,
    strongThreshold: 85,
    minDirectionalGap: 15,
  },
  strategies: {
    TREND_PULLBACK: {
      enabled: true,
      maxChaseDistanceAtr: 0.5,
      expiryBars: 12,
      minRewardRisk: 1.5,
    },
    BREAKOUT_RETEST: {
      enabled: true,
      maxChaseDistanceAtr: 1.0,
      expiryBars: 10,
      minRewardRisk: 1.5,
    },
    FAILED_BREAKOUT: {
      enabled: false,
      maxChaseDistanceAtr: 0.5,
      expiryBars: 6,
      minRewardRisk: 1.5,
    },
    RANGE_REVERSAL: {
      enabled: false,
      maxChaseDistanceAtr: 0.5,
      expiryBars: 8,
      minRewardRisk: 1.5,
    },
  },
  risk: {
    riskPerTradePct: 0.005,
    maxRiskPerTradePct: 0.01,
    maxDailyLossPct: 0.02,
    maxConsecutiveLosses: 3,
    maxOpenPositionsPerSymbol: 1,
    minStopDistanceTicks: 2,
    maxStopDistanceAtr: 3,
    estimatedSlippageTicks: 1,
    commissionPerUnitRoundTrip: 0,
  },
  lifecycle: {
    cooldownBars: 3,
    candidateUpdateThrottleMs: 1000,
  },
};
```

These values are starting defaults for controlled testing only. The implementation must validate ranges and allow per-symbol/per-timeframe overrides. No parameter may be tuned on the final holdout test set.

---

## 22. Backtesting and historical replay

### 22.1. Event-driven replay

Backtesting must reuse the same pure analysis/strategy/scoring/management functions as Live mode. Only the event source and execution simulator differ.

Replay chronological market events, including:

- candle updates if intrabar logic is explicitly tested;
- candle close events;
- pivot set availability at its actual calculation time;
- volume-profile updates and finalization;
- instrument/session metadata;
- corrections only if reproducing a provider correction scenario.

### 22.2. Execution simulator

The simulator must model:

- next available executable quote/price after signal timestamp;
- spread, commission, slippage, tick size, lot size;
- partial exits and quantity rounding;
- stop/target ordering;
- market/session closures and gaps;
- order rejection or unavailable liquidity where supported by data.

If quote/tick data is unavailable, use a documented conservative fill model. Never fill at a price that was only known after the decision timestamp.

### 22.3. Anti-bias requirements

- No look-ahead: only use closed higher-timeframe candles as of decision time.
- No repainting: confirmed swing points become available only after right-side confirmation bars.
- No future pivot: use only pivot sets calculated from completed reference periods available at that time.
- No final developing profile values in earlier decisions.
- No survivorship/data selection bias in instrument sample where relevant.
- No parameter selection using the final out-of-sample period.
- Include costs and conservative intrabar ambiguity handling.

### 22.4. Evaluation metrics

At minimum calculate:

- number of trades/signals;
- win rate;
- gross profit and gross loss;
- net profit after costs;
- profit factor;
- expectancy per trade and expectancy in R;
- maximum drawdown;
- average R and median R;
- Sharpe/Sortino only with documented return sampling assumptions;
- average holding time;
- MFE and MAE distributions;
- stop/target/other exit reason distribution;
- result by strategy, symbol, timeframe, regime, session, and score bucket;
- signal coverage and skipped-signal reason distribution.

### 22.5. Walk-forward process

Use chronological split, not random shuffling:

1. training/calibration period;
2. validation period for parameter selection;
3. untouched holdout period for final report;
4. repeated walk-forward windows where enough history exists.

Report confidence intervals or sample counts where useful. A high win rate with a small sample must not be presented as reliable.

---

## 23. Evals and test strategy

### 23.1. Unit tests

Required test groups:

**Candle/ATR**

- correct TR for normal candles and gaps;
- Wilder ATR initialization and update;
- flat candle division-by-zero handling;
- no update of confirmed ATR from open candle.

**Fibonacci Pivot adapter**

- 5m -> 1D mapping;
- 1h -> 1W mapping;
- unsupported mapping returns a typed error;
- adapter output equals existing implementation fixtures;
- no future/incomplete reference period is used.

**Volume Profile**

- POC with unique maximum;
- deterministic POC tie-break;
- 70% contiguous Value Area expansion;
- deterministic VAH/VAL tie-break;
- empty/zero-volume profile handling;
- approximate data flagged as approximate;
- no fabricated delta.

**Market structure**

- swing high/low confirmation waits for right bars;
- equal-high/low tie handling;
- prominence filter;
- HH/HL/LH/LL classification;
- BOS requires close beyond buffer;
- regime hysteresis and transition behavior.

**Confluence**

- levels cluster within threshold;
- distant levels remain separate;
- correlated POC+HVN do not double-count;
- stable IDs/output ordering.

**Price action**

- bullish/bearish engulfing edge cases;
- wick/rejection thresholds;
- zone interaction required;
- open candle never confirms pattern.

**Scoring and gates**

- fixed weights sum to 100;
- correct normalization and coverage;
- unavailable mandatory factor blocks scoring;
- score cannot override hard gates;
- opposing direction gap enforcement;
- no probability language/value generated.

**Risk/management**

- stop on correct side;
- tick rounding is protective;
- quantity rounds down to lot step;
- costs included;
- partial exits never over-close;
- trailing stop never widens risk;
- stop wins ambiguous OHLC bar in conservative simulator.

### 23.2. Deterministic replay tests

For a fixed historical fixture:

- run the same event sequence twice;
- compare analysis snapshots, setups, scores, signal IDs, lifecycle events, paper fills, and final metrics;
- all outputs must be byte-equivalent after excluding non-deterministic operational metadata such as wall-clock processing duration.

### 23.3. Property-based tests

Useful invariants:

- increasing all prices by a constant should shift price levels/stops/targets by the same constant while preserving dimensionless normalized distances, where applicable;
- scaling all prices and tick/point-value consistently should preserve normalized price-action/ATR relationships;
- volume scaling by a positive constant should not change RVOL or relative profile topology;
- adding an unrelated distant profile bin must not change a local confluence zone;
- receiving a duplicate event must not change state;
- processing a valid ordered stream and replaying it from stored events must produce the same state.

### 23.4. Integration tests

- stream adapter -> normalizer -> analysis -> signal persistence -> event outbox;
- restart recovery from persisted state;
- late candle correction and replay;
- missing pivot/profile data;
- multi-timeframe alignment with an open higher-TF candle;
- concurrent events for different symbols and ordered events for the same symbol.

---

## 24. Acceptance criteria

The feature is not complete until all P0 criteria pass.

### P0 — correctness and safety

1. The engine consumes existing candle, Fibonacci Pivot Points, and Volume Profile outputs through adapters; no duplicate formula implementation is introduced without equivalence tests.
2. The default Fibonacci Pivot mapping is `5m -> 1D` and `1h -> 1W`.
3. Fibonacci Pivot Points and Fibonacci Retracement have distinct types and cannot be accidentally mixed.
4. Open candles can update candidates but cannot confirm entries, swings, BOS, or confirmed candle patterns.
5. Higher-timeframe inputs obey the as-of rule; no unclosed higher-TF candle leaks future data.
6. POC/VAH/VAL calculations are deterministic and covered by fixtures.
7. Volume Delta is unavailable unless directly supported by source data.
8. Signal scores are explainable, versioned, normalized, and are not exposed as win probabilities.
9. A hard gate can block a signal regardless of score.
10. Stop, target, and quantity use instrument tick/lot/point-value specifications and estimated costs.
11. Backtesting uses conservative intrabar handling when stop/target order is unknowable.
12. Duplicate or replayed market events do not generate duplicate signals.
13. The same replay input produces deterministic results.
14. Confirmed signal snapshots are immutable and auditable.
15. Initial release has no real-order execution path enabled.

### P1 — operational quality

1. Live candidate updates are throttled and do not flood the event bus.
2. Per-symbol/timeframe state survives application restart.
3. Late events and candle corrections trigger controlled replay.
4. Metrics expose processing lag, queue depth, event errors, replay time, signal counts, and rejection reasons.
5. Strategy enablement and weights are configurable without code changes.
6. Backtest reports separate results by strategy, symbol, timeframe, regime, and session.

### P2 — later improvements

1. Add validated Failed Breakout and Range Reversal strategies.
2. Add optional Fibonacci Retracement as a separate level source.
3. Add trade-level aggressor/Delta features if trustworthy source data becomes available.
4. Add adaptive per-symbol/timeframe parameter profiles with anti-overfitting controls.
5. Calibrate score-to-outcome probabilities only after enough out-of-sample data, with calibration metrics and explicit sample sufficiency.
6. Consider ML for scenario ranking/regime classification only after the deterministic baseline is established.

---

## 25. Observability and operational metrics

Emit structured logs and metrics with symbol, timeframe, strategy, event ID, algorithm version, and config version.

### Runtime metrics

- `market_event_lag_ms`;
- `market_event_processing_ms`;
- `market_event_queue_depth`;
- `market_event_duplicate_total`;
- `market_event_late_total`;
- `market_event_invalid_total`;
- `analysis_replay_duration_ms`;
- `analysis_state_recovery_total`;
- `live_candidate_update_total`.

### Strategy metrics

- `setup_created_total{strategy,direction}`;
- `setup_invalidated_total{strategy,reason}`;
- `signal_candidate_total{strategy}`;
- `signal_confirmed_total{strategy,direction}`;
- `signal_rejected_total{reason}`;
- `signal_score_histogram{strategy}`;
- `signal_coverage_histogram{strategy}`.

### Paper-trading metrics

- `paper_position_open_total`;
- `paper_position_close_total{reason}`;
- `paper_realized_pnl`;
- `paper_drawdown`;
- `paper_slippage`;
- `paper_fee_total`.

Do not log secrets, broker credentials, or personally identifying account data.

---

## 26. UI/event integration

The core engine publishes typed events. The BENEFITIARIUM frontend may render them using the existing UI stack and TanStack Charts, but the engine must remain UI-agnostic.

Recommended UI concepts:

- Market regime badge (`BULLISH_TREND`, `BEARISH_TREND`, `RANGE`, `TRANSITION`);
- signal status timeline;
- LONG/SHORT score with factor breakdown;
- confluence zones and source-level labels;
- Fibonacci Pivot Point levels with anchor period and method;
- Volume Profile scope and quality label (`EXACT` / `APPROXIMATE`);
- entry reference, executable reference, stop, targets, reward/risk;
- clear distinction between candidate and confirmed signals;
- invalidation/expiry explanation;
- historical signal and paper-trade outcome.

The UI must label the score as an evidence score, never as “probability of profit”.

---

## 27. Recommended implementation sequence

Implement in vertical slices. Keep each slice runnable and testable.

### Phase 0 — repository reconnaissance

- inspect current candle types and live stream flow;
- locate existing Fibonacci Pivot Points module and confirm formula/version;
- locate Volume Profile module and determine input source/quality;
- inspect persistence, message bus, and test framework;
- write a short implementation map before code changes.

**Deliverable:** repository map + adapter plan + identified gaps.

### Phase 1 — shared analysis contracts

- add domain types;
- add event validation and candle normalizer;
- add instrument specification adapter;
- add config validation and versioning.

**Deliverable:** typed contracts and unit tests.

### Phase 2 — feature analyzers

- ATR and candle features;
- Market Structure Analyzer;
- Fibonacci Pivot adapter;
- Volume Profile adapter/analyzer;
- MTF as-of provider.

**Deliverable:** deterministic snapshot from fixture candles/profiles/pivots.

### Phase 3 — confluence and strategies

- level normalization and clustering;
- `TREND_PULLBACK`;
- `BREAKOUT_RETEST`;
- setup lifecycle and expiry/invalidation.

**Deliverable:** explainable candidate setups on historical fixtures.

### Phase 4 — scoring and risk

- score normalization, coverage, contribution records;
- hard eligibility gates;
- entry/SL/TP selection;
- position sizing.

**Deliverable:** confirmed/rejected signal with full explanation and risk numbers.

### Phase 5 — Live processing and persistence

- event idempotency and ordering;
- per-partition state;
- transactional persistence/outbox;
- lifecycle events;
- restart recovery and correction replay.

**Deliverable:** stable Live signal generation without duplicate events.

### Phase 6 — paper trade management

- paper fill simulator;
- partial exits;
- trailing stop;
- exit conditions;
- performance recording.

**Deliverable:** end-to-end paper-trading lifecycle.

### Phase 7 — replay, backtest, Evals

- historical event replay;
- execution cost model;
- performance reports;
- walk-forward and holdout workflows;
- feature and strategy Evals.

**Deliverable:** reproducible evaluation report.

### Phase 8 — enable additional strategies

Only after separate strategy validation:

- `FAILED_BREAKOUT`;
- `RANGE_REVERSAL`;
- optional Fibonacci Retracement confluence.

---

## 28. Decisions that must be confirmed from the existing repository

The AI agent must investigate these items and document the actual answer before implementation. Do not block the whole task waiting for product clarification if the repository already answers them.

1. **Fibonacci Pivot formula:** exact formula name/version and source OHLC period used by the current BENEFITIARIUM implementation.
2. **Pivot timing convention:** whether daily/weekly pivots are derived from the immediately preceding completed period and exactly when they become available.
3. **Volume Profile source:** trade-level/exchange profile, existing calculated bins, or candle-derived estimate.
4. **Profile scopes:** which of current-session, previous-session, rolling, and anchored profiles already exist.
5. **Session calendar:** exchange timezone, session boundaries, holidays, auction/overnight periods, and daily risk reset time.
6. **Instrument metadata:** tick size, lot size, point value, commission model, and price/quantity constraints.
7. **Event semantics:** whether candle stream emits updates, close events, revisions, sequence IDs, and late corrections.
8. **Supported timeframes:** exact available candle intervals and aggregation source for higher timeframes.
9. **Storage/event infrastructure:** current database, cache, message bus, locking/partitioning, and transactional outbox capabilities.
10. **Signal delivery:** which frontend/API channels consume signal events and how candidate updates are throttled.

Any unresolved item must be represented as an explicit configuration or typed `UNAVAILABLE` state. Do not guess and silently proceed with a false assumption.

---

## 29. Reason code catalogue

Use stable machine-readable reason codes. Human-readable messages can be localized in the UI.

### Data and context

- `DATA_INVALID_OHLCV`
- `DATA_STALE`
- `DATA_GAP_DETECTED`
- `DATA_DUPLICATE_EVENT`
- `DATA_LATE_EVENT`
- `DATA_CORRECTION_REPLAY_REQUIRED`
- `PIVOT_SET_UNAVAILABLE`
- `PIVOT_MAPPING_UNSUPPORTED`
- `PIVOT_SET_STALE`
- `VOLUME_PROFILE_UNAVAILABLE`
- `VOLUME_PROFILE_APPROXIMATE`
- `VOLUME_PROFILE_INSUFFICIENT`
- `MTF_UNAVAILABLE`
- `INSTRUMENT_SPEC_UNAVAILABLE`

### Market regime / setup

- `REGIME_BULLISH`
- `REGIME_BEARISH`
- `REGIME_RANGE`
- `REGIME_TRANSITION`
- `REGIME_UNKNOWN`
- `SETUP_ZONE_APPROACHED`
- `SETUP_CONFLUENCE_FOUND`
- `SETUP_PRICE_ACTION_CONFIRMED`
- `SETUP_INVALIDATED`
- `SETUP_EXPIRED`
- `SETUP_TOO_FAR_FROM_ZONE`
- `SETUP_OPPOSING_REGIME`
- `BREAKOUT_CONFIRMED`
- `RETEST_CONFIRMED`
- `FAILED_BREAKOUT_CONFIRMED`
- `RANGE_BOUNDARY_CONFIRMED`

### Scoring / eligibility

- `SCORE_BELOW_THRESHOLD`
- `SCORE_COVERAGE_INSUFFICIENT`
- `SCORE_DIRECTIONAL_GAP_INSUFFICIENT`
- `REQUIRED_FEATURE_UNAVAILABLE`
- `RISK_REWARD_TOO_LOW`
- `STOP_DISTANCE_TOO_SMALL`
- `STOP_DISTANCE_TOO_LARGE`
- `POSITION_SIZE_BELOW_MINIMUM`
- `DUPLICATE_ACTIVE_SETUP`
- `POSITION_ALREADY_OPEN`
- `COOLDOWN_ACTIVE`
- `SESSION_ENTRY_BLOCKED`
- `DAILY_RISK_LIMIT_REACHED`
- `SPREAD_OR_MARKET_QUALITY_BLOCKED`

### Position management

- `STOP_LOSS_HIT`
- `TAKE_PROFIT_HIT`
- `TRAILING_STOP_UPDATED`
- `STRUCTURE_INVALIDATED`
- `OPPOSITE_SIGNAL_CONFIRMED`
- `PROFILE_ACCEPTANCE_REVERSED`
- `TIME_STOP_TRIGGERED`
- `MANUAL_PAPER_CLOSE`

---

## 30. Definition of done

The implementation is ready for controlled paper-trading evaluation when:

- all P0 acceptance criteria pass;
- the repository-specific decisions in Section 28 are documented;
- all formulas have unit tests and fixture-based expectations;
- event replay is deterministic;
- the engine runs continuously on the existing Live stream without duplicate confirmed signals;
- every signal can be reconstructed and explained from persisted inputs;
- paper-trade fees/slippage and conservative fill rules are enabled;
- strategy-level backtest results include out-of-sample and walk-forward analysis;
- the frontend distinguishes candidate, confirmed, invalidated, and expired states;
- real order execution remains disabled pending a separate approval and operational risk review.

**End of specification.**
