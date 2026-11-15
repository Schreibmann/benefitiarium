import { describe, expect, it } from 'vitest';
import { createMincifryHttpsFetch } from './mincifry-https-fetch.js';

describe('createMincifryHttpsFetch', () => {
  it('reaches production history-trades without SELF_SIGNED_CERT_IN_CHAIN', async () => {
    const fetchImpl = await createMincifryHttpsFetch();
    const response = await fetchImpl(
      'https://invest-public-api.tbank.ru/history-trades/2026-11-08?instrumentId=a72e6299-a1c0-439a-98eb-06538cec8ab4',
      { headers: { Authorization: 'Bearer test-token' } },
    );
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  }, 15_000);
});
