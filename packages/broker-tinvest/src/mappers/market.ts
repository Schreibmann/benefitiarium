import type { LastPrice } from '@moex/contracts';
import { parseDecimalString, parseInstrumentId, parseIsoDateTime } from '@moex/domain';
import type { TinvestLastPriceRaw } from '../raw.js';

export function mapTinvestLastPriceToDomain(
  raw: TinvestLastPriceRaw,
  instrumentIdByUid: ReadonlyMap<string, string>,
  receivedAtIso: string,
): LastPrice | null {
  const instrumentId = instrumentIdByUid.get(raw.instrumentUid);
  if (instrumentId === undefined) {
    return null;
  }
  return {
    instrumentId: parseInstrumentId(instrumentId),
    provider: 't-invest',
    last: parseDecimalString(raw.price),
    eventTime: parseIsoDateTime(raw.time),
    receivedAt: parseIsoDateTime(receivedAtIso),
    quality: 'good',
  };
}
