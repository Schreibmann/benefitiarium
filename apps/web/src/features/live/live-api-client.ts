export type LiveRuntimeSnapshot = {
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'DEGRADED';
  desiredStatus: 'STOPPED' | 'RUNNING';
  favoriteCount: number;
  strategyLeaseCount: number;
  analysisIntervals: string[];
  lastError: string | null;
  updatedAt: string;
};

export type FavoriteItem = {
  instrumentUid: string;
  ticker: string;
  figi: string | null;
  createdAt: string;
  lastPrice: string | null;
  dayChangePct: number | null;
};

export type LiveApiClient = {
  getLive: () => Promise<LiveRuntimeSnapshot>;
  startLive: () => Promise<LiveRuntimeSnapshot>;
  stopLive: () => Promise<LiveRuntimeSnapshot>;
  listFavorites: () => Promise<FavoriteItem[]>;
  syncFavorites: () => Promise<FavoriteItem[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field ${key}`);
  }
  return value;
}

function parseSnapshot(json: unknown): LiveRuntimeSnapshot {
  if (!isRecord(json)) {
    throw new Error('Invalid live snapshot');
  }
  const status = json.status;
  const desiredStatus = json.desiredStatus;
  if (
    status !== 'STOPPED' &&
    status !== 'STARTING' &&
    status !== 'RUNNING' &&
    status !== 'STOPPING' &&
    status !== 'DEGRADED'
  ) {
    throw new Error('Invalid live status');
  }
  if (desiredStatus !== 'STOPPED' && desiredStatus !== 'RUNNING') {
    throw new Error('Invalid desired status');
  }
  const favoriteCount = json.favoriteCount;
  const strategyLeaseCount = json.strategyLeaseCount;
  const analysisIntervals = json.analysisIntervals;
  const lastError = json.lastError;
  const updatedAt = json.updatedAt;
  if (
    typeof favoriteCount !== 'number' ||
    typeof strategyLeaseCount !== 'number' ||
    !Array.isArray(analysisIntervals) ||
    typeof updatedAt !== 'string' ||
    (lastError !== null && typeof lastError !== 'string')
  ) {
    throw new Error('Invalid live snapshot fields');
  }
  return {
    status,
    desiredStatus,
    favoriteCount,
    strategyLeaseCount,
    analysisIntervals: analysisIntervals.filter((item): item is string => typeof item === 'string'),
    lastError,
    updatedAt,
  };
}

function parseFavorite(json: unknown): FavoriteItem {
  if (!isRecord(json)) {
    throw new Error('Invalid favorite');
  }
  const figi = json.figi;
  const lastPrice = json.lastPrice;
  const dayChangePct = json.dayChangePct;
  return {
    instrumentUid: requiredString(json, 'instrumentUid'),
    ticker: requiredString(json, 'ticker'),
    figi: typeof figi === 'string' ? figi : null,
    createdAt: requiredString(json, 'createdAt'),
    lastPrice: typeof lastPrice === 'string' ? lastPrice : null,
    dayChangePct:
      typeof dayChangePct === 'number' && Number.isFinite(dayChangePct) ? dayChangePct : null,
  };
}

function parseFavoritesPayload(json: unknown): FavoriteItem[] {
  if (!isRecord(json) || !Array.isArray(json.items)) {
    throw new Error('Invalid favorites list');
  }
  return json.items.map(parseFavorite);
}

export function createLiveApiClient(
  options: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): LiveApiClient {
  const baseUrl = options.baseUrl ?? '';
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(method: string, path: string): Promise<unknown> {
    const response = await fetchImpl(`${baseUrl}${path}`, { method });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
  }

  return {
    getLive: async () => parseSnapshot(await request('GET', '/api/v1/live')),
    startLive: async () => parseSnapshot(await request('POST', '/api/v1/live/start')),
    stopLive: async () => parseSnapshot(await request('POST', '/api/v1/live/stop')),
    listFavorites: async () => parseFavoritesPayload(await request('GET', '/api/v1/favorites')),
    syncFavorites: async () =>
      parseFavoritesPayload(await request('POST', '/api/v1/favorites/sync')),
  };
}
