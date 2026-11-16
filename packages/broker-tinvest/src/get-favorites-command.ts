import { BaseCommand } from '@ttech-pub/invest-sdk-node';
import type { APIService } from '@ttech-pub/invest-sdk-node/src/lib/core/shared/command.js';

export type TinvestFavoriteRaw = {
  uid: string;
  ticker: string;
  figi: string | null;
  name: string | null;
  classCode: string | null;
  instrumentType: string | null;
  apiTradeAvailableFlag: boolean | null;
};

type CommandOutput = {
  favoriteInstruments: unknown[];
};

class GetFavoritesCommand extends BaseCommand<Record<string, never>, Promise<CommandOutput>> {
  override call(client: APIService): Promise<CommandOutput> {
    return client.instruments.getFavorites({}).then((response) => ({
      favoriteInstruments: response.favoriteInstruments,
    }));
  }
}

export function buildGetFavoritesCommand(): GetFavoritesCommand {
  return new GetFavoritesCommand({});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function mapFavoriteInstrument(raw: unknown): TinvestFavoriteRaw | null {
  if (!isRecord(raw)) {
    return null;
  }
  const uid = readString(raw, 'uid');
  const ticker = readString(raw, 'ticker');
  if (uid === null || ticker === null) {
    return null;
  }
  const apiTradeAvailableFlag = raw.apiTradeAvailableFlag;
  return {
    uid,
    ticker,
    figi: readString(raw, 'figi'),
    name: readString(raw, 'name'),
    classCode: readString(raw, 'classCode'),
    instrumentType: readString(raw, 'instrumentType'),
    apiTradeAvailableFlag:
      typeof apiTradeAvailableFlag === 'boolean' ? apiTradeAvailableFlag : null,
  };
}

export function mapFavoritesResponse(response: CommandOutput): TinvestFavoriteRaw[] {
  const rows = Array.isArray(response.favoriteInstruments) ? response.favoriteInstruments : [];
  return rows.map(mapFavoriteInstrument).filter((row): row is TinvestFavoriteRaw => row !== null);
}
