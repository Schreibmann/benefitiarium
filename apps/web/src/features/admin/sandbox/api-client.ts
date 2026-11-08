export type AdminApiClientOptions = {
  baseUrl: string;
  getToken: () => string | null;
  fetchImpl?: typeof fetch;
};

export type AdminApiError = {
  status: number;
  error: string;
  message: string;
};

export type CommandAccepted = {
  operationId: string;
  status: string;
  pollingUrl: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCommandAccepted(value: unknown): CommandAccepted {
  if (
    !isPlainObject(value) ||
    typeof value.operationId !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.pollingUrl !== 'string'
  ) {
    throw {
      status: 500,
      error: 'invalid_response',
      message: 'Unexpected command response shape',
    } satisfies AdminApiError;
  }
  return {
    operationId: value.operationId,
    status: value.status,
    pollingUrl: value.pollingUrl,
  };
}

export function createAdminApiClient(options: AdminApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(
    method: string,
    path: string,
    init?: { body?: unknown; idempotencyKey?: string },
  ): Promise<unknown> {
    const token = options.getToken();
    if (token === null || token.trim().length === 0) {
      throw {
        status: 401,
        error: 'unauthorized',
        message: 'Admin token required',
      } satisfies AdminApiError;
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    };
    if (init?.idempotencyKey !== undefined) {
      headers['idempotency-key'] = init.idempotencyKey;
    }
    const requestInit: RequestInit = { method, headers };
    if (init?.body !== undefined) {
      headers['content-type'] = 'application/json';
      requestInit.body = JSON.stringify(init.body);
    }
    const response = await fetchImpl(`${options.baseUrl}${path}`, requestInit);
    const text = await response.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { message: text };
      }
    }
    if (!response.ok) {
      const message =
        isPlainObject(parsed) && typeof parsed.message === 'string'
          ? parsed.message
          : `HTTP ${response.status}`;
      const error =
        isPlainObject(parsed) && typeof parsed.error === 'string' ? parsed.error : 'request_failed';
      const failure: AdminApiError = { status: response.status, error, message };
      throw failure;
    }
    return parsed;
  }

  return {
    getOverview: () => request('GET', '/api/v1/admin/sandbox/overview'),
    listAccounts: (status?: string) =>
      request(
        'GET',
        status === undefined
          ? '/api/v1/admin/sandbox/accounts'
          : `/api/v1/admin/sandbox/accounts?status=${encodeURIComponent(status)}`,
      ),
    getAccount: (id: string) => request('GET', `/api/v1/admin/sandbox/accounts/${id}`),
    listOperations: () => request('GET', '/api/v1/admin/sandbox/operations'),
    getOperation: (id: string) => request('GET', `/api/v1/admin/sandbox/operations/${id}`),
    listAudit: (accountId: string) =>
      request('GET', `/api/v1/admin/sandbox/accounts/${accountId}/audit`),
    createAccount: async (name: string, idempotencyKey: string) =>
      parseCommandAccepted(
        await request('POST', '/api/v1/admin/sandbox/accounts', {
          body: { name },
          idempotencyKey,
        }),
      ),
    syncAll: async (idempotencyKey: string) =>
      parseCommandAccepted(await request('POST', '/api/v1/admin/sandbox/sync', { idempotencyKey })),
    syncAccount: async (id: string, idempotencyKey: string) =>
      parseCommandAccepted(
        await request('POST', `/api/v1/admin/sandbox/accounts/${id}/sync`, {
          idempotencyKey,
        }),
      ),
    fundAccount: async (id: string, amount: string, idempotencyKey: string) =>
      parseCommandAccepted(
        await request('POST', `/api/v1/admin/sandbox/accounts/${id}/fund`, {
          body: { amount, currency: 'RUB' },
          idempotencyKey,
        }),
      ),
    previewClose: (id: string) =>
      request('POST', `/api/v1/admin/sandbox/accounts/${id}/close/preview`),
    closeAccount: async (
      id: string,
      body: {
        previewId: string;
        confirmation: string;
        acknowledgeOpenPositionsAndOrders: boolean;
      },
      idempotencyKey: string,
    ) =>
      parseCommandAccepted(
        await request('POST', `/api/v1/admin/sandbox/accounts/${id}/close`, {
          body,
          idempotencyKey,
        }),
      ),
  };
}

export type AdminApiClient = ReturnType<typeof createAdminApiClient>;
