/**
 * MOEX AlgoPack / ISS FORTS futures candles path helpers (BL-033).
 *
 * Documented endpoint shape:
 * `/iss/engines/futures/markets/forts/boards/rfud/securities/:ticker/candles.json`
 *
 * Access may require AlgoPack authorization; treat missing history as unavailable,
 * never as zero market volume.
 */

export const MOEX_FORTS_ENGINE = 'futures' as const;
export const MOEX_FORTS_MARKET = 'forts' as const;
export const MOEX_FORTS_BOARD_RFUD = 'RFUD' as const;

export type FortsCandlesPathInput = {
  ticker: string;
  board?: string;
};

export type FortsCandlesQuery = {
  from?: string;
  till?: string;
  /** ISS candle interval code (e.g. 1, 10, 60, 24). */
  interval?: number;
  start?: number;
};

export function buildFortsCandlesPath(input: FortsCandlesPathInput): string {
  const ticker = input.ticker.trim().toUpperCase();
  if (ticker.length === 0) {
    throw new Error('FORTS ticker is required');
  }
  const board = (input.board ?? MOEX_FORTS_BOARD_RFUD).trim().toLowerCase();
  return `/engines/${MOEX_FORTS_ENGINE}/markets/${MOEX_FORTS_MARKET}/boards/${board}/securities/${encodeURIComponent(ticker)}/candles.json`;
}
