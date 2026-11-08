export type MoexIssBlock = {
  metadata?: Array<{ name: string; type?: string }>;
  columns: string[];
  data: unknown[][];
};

export type MoexIssResponse = Record<string, MoexIssBlock>;

export type MoexIssClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  /**
   * Optional AlgoPack / authenticated ISS token.
   * Sent as `Authorization: Bearer …` when authMode is authenticated.
   */
  authToken?: string;
  authMode?: 'anonymous' | 'authenticated';
};
