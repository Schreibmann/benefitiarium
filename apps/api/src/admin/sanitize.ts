const SECRET_FRAGMENT =
  /(token|secret|password|authorization|api[_-]?key|bearer\s+[a-z0-9\-._~+/=]+)/gi;

/** Strip secrets from error messages returned to Admin API clients. */
export function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(SECRET_FRAGMENT, '[REDACTED]').slice(0, 500);
}

export function assertSandboxEndpointHost(endpointHost: string): void {
  if (endpointHost !== 'sandbox-invest-public-api.tbank.ru') {
    throw new Error('Sandbox Admin API refuses non-sandbox endpoint host');
  }
}

export function assertNotProductionBaseUrl(baseUrl: string): void {
  const normalized = baseUrl.toLowerCase();
  if (
    normalized.includes('invest-public-api.tbank.ru') &&
    !normalized.includes('sandbox-invest-public-api.tbank.ru')
  ) {
    throw new Error('Sandbox Admin API refuses production T-Invest base URL');
  }
}
