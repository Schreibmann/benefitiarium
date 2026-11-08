import type { ProviderInstrument } from '@moex/contracts';
import { parseInstrumentId, type Instrument, type InstrumentProviderId } from '@moex/domain';
import { randomUUID } from 'node:crypto';
import type { MoexIssInstrumentRef } from './moex-ref.js';

export type MappedInstrument = {
  instrument: Instrument;
  providerIds: InstrumentProviderId[];
};

export type AmbiguousTickerGroup = {
  ticker: string;
  tinvest: ProviderInstrument[];
  moex: MoexIssInstrumentRef[];
};

export type InstrumentMappingResult = {
  matched: MappedInstrument[];
  unmatchedTinvest: ProviderInstrument[];
  unmatchedMoex: MoexIssInstrumentRef[];
  ambiguous: AmbiguousTickerGroup[];
};

export type MapInstrumentsInput = {
  tinvest: ProviderInstrument[];
  moex: MoexIssInstrumentRef[];
  createId?: () => string;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * T-Invest class_code ↔ MOEX ISS board aliases.
 * Futures catalog uses class_code SPBFUT; ISS FORTS candles use board RFUD (AlgoPack path).
 */
const BOARD_ALIASES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['SPBFUT', new Set(['SPBFUT', 'RFUD'])],
  ['RFUD', new Set(['SPBFUT', 'RFUD'])],
]);

function boardsCompatible(classCode: string | null, board: string): boolean {
  if (classCode === null || classCode.length === 0) {
    return false;
  }
  const left = classCode.toUpperCase();
  const right = board.toUpperCase();
  if (left === right) {
    return true;
  }
  const aliases = BOARD_ALIASES.get(left);
  return aliases !== undefined && aliases.has(right);
}

function buildMappedInstrument(
  tinvestItem: ProviderInstrument,
  moexItem: MoexIssInstrumentRef,
  createId: () => string,
): MappedInstrument {
  const id = parseInstrumentId(createId());
  const instrument: Instrument = {
    id,
    assetType: tinvestItem.assetType,
    ticker: tinvestItem.ticker,
    name: tinvestItem.name,
    exchange: 'MOEX',
    currency: tinvestItem.currency,
    isActive: tinvestItem.isActive,
  };
  const providerIds: InstrumentProviderId[] = [
    {
      instrumentId: id,
      provider: 't-invest',
      providerInstrumentId: tinvestItem.providerInstrumentId,
      classCode: tinvestItem.classCode,
      engine: null,
      market: null,
      board: null,
      secid: null,
      isPrimary: true,
    },
    {
      instrumentId: id,
      provider: 'moex-iss',
      providerInstrumentId: `${moexItem.engine}:${moexItem.market}:${moexItem.board}:${moexItem.secid}`,
      engine: moexItem.engine,
      market: moexItem.market,
      board: moexItem.board,
      secid: moexItem.secid,
      classCode: moexItem.board,
      isPrimary: false,
    },
  ];
  return { instrument, providerIds };
}

/**
 * Cross-provider mapping for MVP catalog.
 * Ambiguous tickers are never auto-linked.
 */
export function mapInstrumentsAcrossProviders(input: MapInstrumentsInput): InstrumentMappingResult {
  const createId = input.createId ?? (() => randomUUID());
  const matched: MappedInstrument[] = [];
  const ambiguous: AmbiguousTickerGroup[] = [];
  const usedTinvest = new Set<ProviderInstrument>();
  const usedMoex = new Set<MoexIssInstrumentRef>();

  const tinvestByTicker = new Map<string, ProviderInstrument[]>();
  for (const item of input.tinvest) {
    const key = normalizeTicker(item.ticker);
    const bucket = tinvestByTicker.get(key) ?? [];
    bucket.push(item);
    tinvestByTicker.set(key, bucket);
  }

  const moexBySecid = new Map<string, MoexIssInstrumentRef[]>();
  for (const item of input.moex) {
    const key = normalizeTicker(item.secid);
    const bucket = moexBySecid.get(key) ?? [];
    bucket.push(item);
    moexBySecid.set(key, bucket);
  }

  for (const [ticker, tinvestItems] of tinvestByTicker) {
    const moexItems = moexBySecid.get(ticker) ?? [];
    if (moexItems.length === 0) {
      continue;
    }

    const compatiblePairs: Array<{ tinvest: ProviderInstrument; moex: MoexIssInstrumentRef }> = [];
    for (const tinvestItem of tinvestItems) {
      for (const moexItem of moexItems) {
        if (boardsCompatible(tinvestItem.classCode, moexItem.board)) {
          compatiblePairs.push({ tinvest: tinvestItem, moex: moexItem });
        }
      }
    }

    if (compatiblePairs.length === 1) {
      const pair = compatiblePairs[0];
      if (!pair) {
        continue;
      }
      matched.push(buildMappedInstrument(pair.tinvest, pair.moex, createId));
      usedTinvest.add(pair.tinvest);
      usedMoex.add(pair.moex);
      continue;
    }

    if (compatiblePairs.length === 0) {
      // Same ticker, no classCode↔board agreement: leave unmatched, not auto-mapped.
      continue;
    }

    ambiguous.push({ ticker, tinvest: tinvestItems, moex: moexItems });
  }

  return {
    matched,
    unmatchedTinvest: input.tinvest.filter((item) => !usedTinvest.has(item)),
    unmatchedMoex: input.moex.filter((item) => !usedMoex.has(item)),
    ambiguous,
  };
}
