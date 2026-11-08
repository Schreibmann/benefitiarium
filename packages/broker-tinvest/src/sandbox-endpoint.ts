/** Allowlisted T-Invest Sandbox host — must never be overridden by UI/request DTO. */
export const TINVEST_SANDBOX_HOST = 'sandbox-invest-public-api.tbank.ru' as const;
export const TINVEST_SANDBOX_URL = `https://${TINVEST_SANDBOX_HOST}:443` as const;

export function assertSandboxUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid sandbox URL: ${url}`);
  }
  if (parsed.hostname !== TINVEST_SANDBOX_HOST) {
    throw new Error(
      `Sandbox client refuses non-allowlisted host "${parsed.hostname}"; expected ${TINVEST_SANDBOX_HOST}`,
    );
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Sandbox client requires https');
  }
}
