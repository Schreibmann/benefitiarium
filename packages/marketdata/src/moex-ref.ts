export type MoexIssInstrumentRef = {
  engine: string;
  market: string;
  board: string;
  secid: string;
  shortName: string | null;
  isin: string | null;
};
