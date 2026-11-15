import { gunzipSync, inflateRawSync } from 'node:zlib';
import { createMincifryHttpsFetch } from './mincifry-https-fetch.js';
import type { TinvestTradeDirection, TinvestTradeRaw } from './raw.js';

export const HISTORY_TRADES_ARCHIVE_HOSTS = [
  'https://invest-public-api.tbank.ru',
  'https://invest-public-api.tinkoff.ru',
] as const;

/** Archive endpoint allows ~30 files/min per IP. */
export const HISTORY_TRADES_THROTTLE_MS = 2_100;

export type HistoryTradesClient = {
  /**
   * Fetch anonymized trades for one UTC calendar day.
   * Returns null when the archive is missing (404 — weekend/holiday/not built yet).
   */
  fetchDayTrades: (input: {
    instrumentUid: string;
    /** YYYY-MM-DD */
    date: string;
  }) => Promise<TinvestTradeRaw[] | null>;
};

export type CreateHistoryTradesClientInput = {
  token: string;
  fetchImpl?: typeof fetch;
  hosts?: readonly string[];
};

/**
 * REST History MD client for daily anonymized trades:
 * GET /history-trades/{YYYY-MM-DD}?instrumentId={uid}
 *
 * CSV header: TRADE_TS,TICKER_CC,DIRECTION,PRICE,QUANTITY,TRADE_SOURCE,INSTRUMENT_UID
 * Body may be plain CSV, gzip, or a ZIP of CSV files.
 *
 * Default transport uses Mincifry CA (Node plain `fetch` fails T-Invest TLS).
 * Pass `TINVEST_READ_ONLY_TOKEN` — sandbox tokens are not valid for production archives.
 */
export function createHistoryTradesClient(
  input: CreateHistoryTradesClientInput,
): HistoryTradesClient {
  const token = input.token.trim();
  if (token.length === 0) {
    throw new Error('History trades client requires a non-empty TINVEST_READ_ONLY_TOKEN');
  }
  const hosts = input.hosts ?? HISTORY_TRADES_ARCHIVE_HOSTS;
  let pinnedHost: string | null = null;
  let resolvedFetch: typeof fetch | null = input.fetchImpl ?? null;
  let fetchInit: Promise<typeof fetch> | null = null;

  async function getFetch(): Promise<typeof fetch> {
    if (resolvedFetch !== null) {
      return resolvedFetch;
    }
    if (fetchInit === null) {
      fetchInit = createMincifryHttpsFetch().then((impl) => {
        resolvedFetch = impl;
        return impl;
      });
    }
    return await fetchInit;
  }

  return {
    fetchDayTrades: async ({ instrumentUid, date }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid history-trades date: ${date}`);
      }
      const path = `/history-trades/${date}?instrumentId=${encodeURIComponent(instrumentUid)}`;
      const orderedHosts =
        pinnedHost === null
          ? [...hosts]
          : [pinnedHost, ...hosts.filter((host) => host !== pinnedHost)];

      const fetchImpl = await getFetch();
      const failures: string[] = [];
      for (const host of orderedHosts) {
        const url = `${host}${path}`;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          let response: Response;
          try {
            response = await fetchImpl(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (error: unknown) {
            failures.push(`${url}: ${formatFetchError(error)}`);
            break;
          }

          if (response.status === 404) {
            pinnedHost = host;
            return null;
          }
          if (response.ok) {
            pinnedHost = host;
            const bytes = new Uint8Array(await response.arrayBuffer());
            const csv = decodeArchiveToCsv(bytes);
            return parseTradesCsv(csv, instrumentUid);
          }
          if (response.status === 429 && attempt < 2) {
            await sleep(60_000);
            continue;
          }
          failures.push(`${url}: HTTP ${response.status}`);
          break;
        }
      }
      throw new Error(
        `history-trades ${date} failed: ${failures.join('; ') || 'no hosts'} — use TINVEST_READ_ONLY_TOKEN against production hosts (sandbox token/URL will not work)`,
      );
    },
  };
}

function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'network error';
  }
  const cause = error.cause;
  if (cause instanceof Error && cause.message.length > 0) {
    return `${error.message} (${cause.message})`;
  }
  return error.message;
}

export function decodeArchiveToCsv(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return decodeZipToCsv(bytes);
  }
  const raw =
    bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes;
  return Buffer.from(raw).toString('utf8').trim();
}

function readU8(bytes: Uint8Array, index: number): number {
  const value = bytes[index];
  if (value === undefined) {
    throw new Error(`ZIP byte out of range at ${index}`);
  }
  return value;
}

function readU16LE(bytes: Uint8Array, index: number): number {
  return readU8(bytes, index) | (readU8(bytes, index + 1) << 8);
}

function readU32LE(bytes: Uint8Array, index: number): number {
  return (
    readU8(bytes, index) |
    (readU8(bytes, index + 1) << 8) |
    (readU8(bytes, index + 2) << 16) |
    (readU8(bytes, index + 3) << 24)
  );
}

/** Minimal ZIP reader for store / deflate entries (History MD archives). */
function decodeZipToCsv(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (
      readU8(bytes, offset) !== 0x50 ||
      readU8(bytes, offset + 1) !== 0x4b ||
      readU8(bytes, offset + 2) !== 0x03 ||
      readU8(bytes, offset + 3) !== 0x04
    ) {
      break;
    }
    const compression = readU16LE(bytes, offset + 8);
    const compSize = readU32LE(bytes, offset + 18);
    const nameLen = readU16LE(bytes, offset + 26);
    const extraLen = readU16LE(bytes, offset + 28);
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > bytes.length) {
      break;
    }
    const compressed = bytes.subarray(dataStart, dataEnd);
    let uncompressed: Uint8Array;
    if (compression === 0) {
      uncompressed = compressed;
    } else if (compression === 8) {
      uncompressed = inflateRawSync(compressed);
    } else {
      offset = dataEnd;
      continue;
    }
    const text = Buffer.from(uncompressed).toString('utf8').trim();
    if (text.length > 0) {
      chunks.push(text);
    }
    offset = dataEnd;
  }
  return chunks.join('\n');
}

export function parseTradesCsv(csv: string, fallbackInstrumentUid: string): TinvestTradeRaw[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }

  let startIndex = 0;
  const header = lines[0] ?? '';
  if (header.toUpperCase().startsWith('TRADE_TS')) {
    startIndex = 1;
  }

  const trades: TinvestTradeRaw[] = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    const cols = splitCsvLine(line);
    if (cols.length < 5) {
      continue;
    }
    const timeRaw = cols[0] ?? '';
    const directionRaw = (cols[2] ?? '').trim().toUpperCase();
    const price = (cols[3] ?? '').trim();
    const quantity = (cols[4] ?? '').trim();
    const instrumentUid = (cols[6] ?? '').trim() || fallbackInstrumentUid;
    if (timeRaw.length === 0 || price.length === 0 || quantity.length === 0) {
      continue;
    }
    const time = normalizeTradeTimestamp(timeRaw);
    trades.push({
      instrumentUid,
      price,
      quantity,
      direction: mapCsvDirection(directionRaw),
      time,
    });
  }
  return trades;
}

function mapCsvDirection(value: string): TinvestTradeDirection {
  if (
    value === 'BUY' ||
    value === 'TRADE_DIRECTION_BUY' ||
    value === '1' ||
    value.includes('BUY')
  ) {
    return 'buy';
  }
  if (
    value === 'SELL' ||
    value === 'TRADE_DIRECTION_SELL' ||
    value === '2' ||
    value.includes('SELL')
  ) {
    return 'sell';
  }
  return 'unspecified';
}

function normalizeTradeTimestamp(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return value;
}

function splitCsvLine(line: string): string[] {
  // History MD uses comma separators without embedded commas in practice.
  return line.split(',');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Inclusive UTC calendar dates YYYY-MM-DD from `from` through `to` (by calendar day). */
export function enumerateUtcDates(from: Date, to: Date): string[] {
  if (!(from < to)) {
    return [];
  }
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const endDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  // If `to` is exactly midnight, the last day is the previous calendar day.
  const last =
    to.getUTCHours() === 0 &&
    to.getUTCMinutes() === 0 &&
    to.getUTCSeconds() === 0 &&
    to.getUTCMilliseconds() === 0
      ? new Date(endDay.getTime() - 24 * 60 * 60 * 1000)
      : endDay;

  while (cursor.getTime() <= last.getTime()) {
    dates.push(formatUtcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function utcTodayString(now: Date): string {
  return formatUtcDate(now);
}
