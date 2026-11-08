import { createLogger, type Logger } from '@moex/observability';
import { type MoexIssRow, mapIssBlockRows } from './map-columns.js';
import type { MoexIssClientOptions, MoexIssResponse } from './types.js';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseJsonObject(text: string): MoexIssResponse {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('MOEX ISS response must be a JSON object');
  }
  const result: MoexIssResponse = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'columns' in value &&
      'data' in value &&
      Array.isArray(value.columns) &&
      Array.isArray(value.data)
    ) {
      result[key] = {
        columns: value.columns.map(String),
        data: value.data,
        ...('metadata' in value && Array.isArray(value.metadata)
          ? { metadata: value.metadata }
          : {}),
      };
    }
  }
  return result;
}

export class MoexIssClient {
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #fetchImpl: typeof fetch;
  readonly #logger: Logger;
  readonly #authMode: 'anonymous' | 'authenticated';
  readonly #authToken: string;

  constructor(options: MoexIssClientOptions, logger?: Logger) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, '');
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#logger = logger ?? createLogger({ service: '@moex/marketdata-moex-iss', level: 'info' });
    this.#authMode = options.authMode ?? 'anonymous';
    this.#authToken = options.authToken?.trim() ?? '';
  }

  #requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.#authMode === 'authenticated') {
      if (this.#authToken.length === 0) {
        throw new Error('MOEX ISS authenticated mode requires authToken');
      }
      headers.Authorization = `Bearer ${this.#authToken}`;
    }
    return headers;
  }

  async getJson(
    path: string,
    query: Record<string, string | number | undefined> = {},
  ): Promise<MoexIssResponse> {
    const url = new URL(path.startsWith('http') ? path : `${this.#baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.#maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
      try {
        const response = await this.#fetchImpl(url, {
          method: 'GET',
          signal: controller.signal,
          headers: this.#requestHeaders(),
        });

        if (!response.ok) {
          if (isRetriableStatus(response.status) && attempt < this.#maxRetries) {
            attempt += 1;
            const backoffMs = Math.min(2_000, 200 * 2 ** attempt) + Math.floor(Math.random() * 100);
            this.#logger.warn('MOEX ISS retriable HTTP error', {
              status: response.status,
              attempt,
              path: url.pathname,
            });
            await sleep(backoffMs);
            continue;
          }
          throw new Error(`MOEX ISS HTTP ${response.status} for ${url.pathname}`);
        }

        const text = await response.text();
        return parseJsonObject(text);
      } catch (error: unknown) {
        lastError = error;
        const aborted =
          typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          error.name === 'AbortError';
        if (aborted || attempt >= this.#maxRetries) {
          throw error;
        }
        attempt += 1;
        const backoffMs = Math.min(2_000, 200 * 2 ** attempt) + Math.floor(Math.random() * 100);
        this.#logger.warn('MOEX ISS request failed, retrying', {
          attempt,
          path: url.pathname,
          error: String(error),
        });
        await sleep(backoffMs);
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async getBlockRows(
    path: string,
    blockName: string,
    query: Record<string, string | number | undefined> = {},
  ): Promise<MoexIssRow[]> {
    const payload = await this.getJson(path, query);
    const block = payload[blockName];
    if (!block || !Array.isArray(block.columns) || !Array.isArray(block.data)) {
      throw new Error(`MOEX ISS block "${blockName}" missing or invalid`);
    }
    return mapIssBlockRows(block);
  }

  /**
   * Paginates ISS collections using `start` until a page returns fewer than `pageSize` rows
   * (or an empty page).
   */
  async getAllBlockRows(
    path: string,
    blockName: string,
    query: Record<string, string | number | undefined> = {},
    pageSize = 100,
  ): Promise<MoexIssRow[]> {
    const rows: MoexIssRow[] = [];
    let start = 0;

    for (;;) {
      const page = await this.getBlockRows(path, blockName, {
        ...query,
        start,
      });
      rows.push(...page);
      if (page.length < pageSize) {
        break;
      }
      start += page.length;
    }

    return rows;
  }
}
