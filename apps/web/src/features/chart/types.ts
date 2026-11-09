export type ChartTimeframe = '5m' | '1h';

export type CandleRow = {
  Date: Date;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  isClosed: boolean;
};

export type PivotLevelName = 'P' | 'R1' | 'R2' | 'R3' | 'S1' | 'S2' | 'S3';

export type PivotSegment = {
  id: string;
  periodId: string;
  level: PivotLevelName;
  x1: Date;
  x2: Date;
  y1: number;
  y2: number;
};

export type InstrumentLookup = {
  instrumentUid: string;
  ticker: string;
  name: string;
  assetType: string;
};

export type FibonacciPivotApiResponse = {
  instrumentUid: string;
  chartTimeframe: ChartTimeframe;
  referenceTimeframe: '1D' | '1W';
  periods: Array<{
    sourcePeriod: {
      id: string;
      timeframe: '1D' | '1W';
      start: string;
      end: string;
    };
    validPeriod: {
      id: string;
      start: string;
      end: string;
    };
    values: {
      p: string;
      r1: string;
      r2: string;
      r3: string;
      s1: string;
      s2: string;
      s3: string;
    };
    algorithm: {
      id: string;
      version: string;
    };
  }>;
  meta: {
    requestedFrom: string;
    requestedTo: string;
    hasGaps: boolean;
    missingPeriodIds?: string[];
  };
};
