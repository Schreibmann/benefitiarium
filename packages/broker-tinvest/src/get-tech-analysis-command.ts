import {
  type GetTechAnalysisRequest,
  GetTechAnalysisRequest_IndicatorInterval,
  GetTechAnalysisRequest_IndicatorType,
  GetTechAnalysisRequest_TypeOfPrice,
  type Quotation,
} from '@ttech-pub/grpc-node-client';
import { BaseCommand } from '@ttech-pub/invest-sdk-node';
import type { APIService } from '@ttech-pub/invest-sdk-node/src/lib/core/shared/command.js';
import { optionalQuotationToDecimalString } from './mappers/quotation.js';
import type {
  TinvestGetTechAnalysisInput,
  TinvestTechAnalysisIndicatorType,
  TinvestTechAnalysisInterval,
  TinvestTechAnalysisItemRaw,
  TinvestTechAnalysisPriceType,
} from './raw.js';

/**
 * Local BaseCommand wrapper around MarketDataService.GetTechAnalysis.
 *
 * SDK 1.61.0 ships `GetTechAnalysisIndicatorsCommand` but does not re-export it from the
 * package barrel, and its mapper omits `upperBand`. This command maps all Quotation fields.
 *
 * IndicatorType surface is BB | EMA | RSI | MACD | SMA only — T-Invest does **not** expose
 * Fibonacci or horizontal volume / volume profile via GetTechAnalysis.
 */

type CommandInput = {
  indicatorType: GetTechAnalysisRequest_IndicatorType;
  instrumentUid: string;
  from: Date;
  to: Date;
  interval: GetTechAnalysisRequest_IndicatorInterval;
  typeOfPrice: GetTechAnalysisRequest_TypeOfPrice;
  length: number;
  deviation?: { deviationMultiplier: Quotation };
  smoothing?: {
    fastLength: number;
    slowLength: number;
    signalSmoothing: number;
  };
};

type CommandOutput = {
  technicalIndicators: Array<{
    timestamp: Date | undefined;
    middleBand?: Quotation;
    upperBand?: Quotation;
    lowerBand?: Quotation;
    signal?: Quotation;
    macd?: Quotation;
  }>;
};

class GetTechAnalysisCommand extends BaseCommand<CommandInput, Promise<CommandOutput>> {
  override call(client: APIService): Promise<CommandOutput> {
    const options = this.options;
    const request: GetTechAnalysisRequest = {
      indicatorType: options.indicatorType,
      instrumentUid: options.instrumentUid,
      from: options.from,
      to: options.to,
      interval: options.interval,
      typeOfPrice: options.typeOfPrice,
      length: options.length,
      deviation: options.deviation ?? undefined,
      smoothing: options.smoothing ?? undefined,
    };
    return client.marketdata.getTechAnalysis(request).then((response) => {
      const technicalIndicators: CommandOutput['technicalIndicators'] = [];
      for (const value of response.technicalIndicators) {
        const item: CommandOutput['technicalIndicators'][number] = {
          timestamp: value.timestamp,
        };
        if (value.middleBand !== undefined) {
          item.middleBand = value.middleBand;
        }
        if (value.upperBand !== undefined) {
          item.upperBand = value.upperBand;
        }
        if (value.lowerBand !== undefined) {
          item.lowerBand = value.lowerBand;
        }
        if (value.signal !== undefined) {
          item.signal = value.signal;
        }
        if (value.macd !== undefined) {
          item.macd = value.macd;
        }
        technicalIndicators.push(item);
      }
      return { technicalIndicators };
    });
  }
}

function mapIndicatorType(
  value: TinvestTechAnalysisIndicatorType,
): GetTechAnalysisRequest_IndicatorType {
  if (value === 'bb') {
    return GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_BB;
  }
  if (value === 'ema') {
    return GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_EMA;
  }
  if (value === 'rsi') {
    return GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_RSI;
  }
  if (value === 'macd') {
    return GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_MACD;
  }
  return GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_SMA;
}

function mapInterval(value: TinvestTechAnalysisInterval): GetTechAnalysisRequest_IndicatorInterval {
  switch (value) {
    case '1m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_ONE_MINUTE;
    case '2m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_2_MIN;
    case '3m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_3_MIN;
    case '5m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_FIVE_MINUTES;
    case '10m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_10_MIN;
    case '15m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_FIFTEEN_MINUTES;
    case '30m':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_30_MIN;
    case '1h':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_ONE_HOUR;
    case '2h':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_2_HOUR;
    case '4h':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_4_HOUR;
    case '1d':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_ONE_DAY;
    case '1w':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_WEEK;
    case '1M':
      return GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_MONTH;
  }
}

function mapPriceType(value: TinvestTechAnalysisPriceType): GetTechAnalysisRequest_TypeOfPrice {
  if (value === 'close') {
    return GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_CLOSE;
  }
  if (value === 'open') {
    return GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_OPEN;
  }
  if (value === 'high') {
    return GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_HIGH;
  }
  if (value === 'low') {
    return GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_LOW;
  }
  return GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_AVG;
}

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

function parseDeviationMultiplier(value: string): Quotation {
  const negative = value.startsWith('-');
  const normalized = negative ? value.slice(1) : value;
  const [unitsPart, fracPart] = normalized.split('.');
  const unitsAbs = Number(unitsPart ?? '0');
  const nanoAbs = fracPart === undefined ? 0 : Number(fracPart.padEnd(9, '0').slice(0, 9));
  if (!Number.isFinite(unitsAbs) || !Number.isFinite(nanoAbs)) {
    throw new Error(`Invalid deviationMultiplier: ${value}`);
  }
  if (negative) {
    return { units: -unitsAbs, nano: -nanoAbs };
  }
  return { units: unitsAbs, nano: nanoAbs };
}

export function buildGetTechAnalysisCommand(
  input: TinvestGetTechAnalysisInput,
): GetTechAnalysisCommand {
  const commandInput: CommandInput = {
    indicatorType: mapIndicatorType(input.indicatorType),
    instrumentUid: input.instrumentUid,
    from: input.from,
    to: input.to,
    interval: mapInterval(input.interval),
    typeOfPrice: mapPriceType(input.typeOfPrice),
    length: input.length ?? 0,
  };
  if (input.deviationMultiplier !== undefined) {
    commandInput.deviation = {
      deviationMultiplier: parseDeviationMultiplier(input.deviationMultiplier),
    };
  }
  if (input.smoothing !== undefined) {
    commandInput.smoothing = input.smoothing;
  }
  return new GetTechAnalysisCommand(commandInput);
}

export function mapTechAnalysisResponse(
  items: CommandOutput['technicalIndicators'],
): TinvestTechAnalysisItemRaw[] {
  const mapped: TinvestTechAnalysisItemRaw[] = [];
  for (const item of items) {
    const timestamp = isoOrNull(item.timestamp);
    if (timestamp === null) {
      continue;
    }
    mapped.push({
      timestamp,
      middleBand: optionalQuotationToDecimalString(item.middleBand, 'middleBand'),
      upperBand: optionalQuotationToDecimalString(item.upperBand, 'upperBand'),
      lowerBand: optionalQuotationToDecimalString(item.lowerBand, 'lowerBand'),
      signal: optionalQuotationToDecimalString(item.signal, 'signal'),
      macd: optionalQuotationToDecimalString(item.macd, 'macd'),
    });
  }
  return mapped;
}

/**
 * Note for callers: local Fibonacci Pivot Points (`@moex/indicators`) are a different
 * indicator than anything in GetTechAnalysis (which has no Fibonacci type). Horizontal
 * volume / volume profile is also absent from the T-Invest tech-analysis API surface.
 */
export const TECH_ANALYSIS_API_GAPS = {
  fibonacci: 'not_in_gettechanalysis',
  horizontalVolume: 'not_in_gettechanalysis',
  localFibonacciPivots: 'apps/api fibonacci-pivots route — keep; not superseded',
  localHorizontalVolume:
    'apps/api horizontal-volume route — OHLCV approximation until GetLastTrades',
} as const;
