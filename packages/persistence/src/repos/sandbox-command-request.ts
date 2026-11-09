/**
 * Mirrors sandbox-management SandboxCommandRequest without importing that package
 * (persistence must not depend on apps/services).
 */
export type PersistedSandboxCommandRequest =
  | { type: 'create'; name: string }
  | { type: 'fund'; amount: string; currency: 'RUB' }
  | { type: 'close' }
  | { type: 'sync'; accountId: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePersistedSandboxCommandRequest(
  input: unknown,
): PersistedSandboxCommandRequest {
  if (!isRecord(input) || typeof input.type !== 'string') {
    throw new Error('Invalid sandbox command request');
  }
  if (input.type === 'create') {
    if (typeof input.name !== 'string' || input.name.trim().length === 0) {
      throw new Error('create request requires name');
    }
    return { type: 'create', name: input.name };
  }
  if (input.type === 'fund') {
    if (typeof input.amount !== 'string' || input.currency !== 'RUB') {
      throw new Error('fund request requires amount string and currency RUB');
    }
    return { type: 'fund', amount: input.amount, currency: 'RUB' };
  }
  if (input.type === 'close') {
    return { type: 'close' };
  }
  if (input.type === 'sync') {
    const accountId = input.accountId;
    if (accountId !== null && typeof accountId !== 'string') {
      throw new Error('sync request accountId must be string or null');
    }
    return { type: 'sync', accountId };
  }
  throw new Error(`Unknown sandbox command request type: ${input.type}`);
}

export function requestEnvelopeJson(request: PersistedSandboxCommandRequest): string {
  return JSON.stringify({ request });
}
