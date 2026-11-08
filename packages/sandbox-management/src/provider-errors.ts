/**
 * Classify provider failures for Sandbox write commands (BL-087).
 * Timeouts / connection resets → operation status `unknown` (no blind retry).
 */

export function isTimeoutLikeProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  return (
    name.includes('timeout') ||
    name.includes('abort') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadline') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('504') ||
    message.includes('gateway timeout')
  );
}

export function providerErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
