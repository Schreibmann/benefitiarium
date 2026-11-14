export type TelegramSendResult = {
  messageId: string;
};

export type TelegramClient = {
  sendMessage: (input: { chatId: string; text: string }) => Promise<TelegramSendResult>;
};

export type TelegramClientOptions = {
  botToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiBaseUrl?: string;
};

export class TelegramHttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  readonly responseBody: string;

  constructor(input: {
    status: number;
    message: string;
    retryAfterSeconds?: number | null;
    responseBody?: string;
  }) {
    super(input.message);
    this.name = 'TelegramHttpError';
    this.status = input.status;
    this.retryAfterSeconds = input.retryAfterSeconds ?? null;
    this.responseBody = input.responseBody ?? '';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRetryAfter(headers: Headers, body: unknown): number | null {
  const header = headers.get('retry-after');
  if (header !== null) {
    const parsed = Number(header);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  if (isRecord(body) && isRecord(body.parameters)) {
    const value = body.parameters.retry_after;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return null;
}

/**
 * Minimal Telegram Bot API client using built-in fetch (no extra deps).
 * Token must never be logged by callers.
 */
export function createTelegramClient(options: TelegramClientOptions): TelegramClient {
  const token = options.botToken.trim();
  if (token.length === 0) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const apiBaseUrl = (options.apiBaseUrl ?? 'https://api.telegram.org').replace(/\/$/, '');

  return {
    async sendMessage({ chatId, text }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${apiBaseUrl}/bot${token}/sendMessage`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });

        const rawBody = await response.text();
        let parsed: unknown = null;
        try {
          parsed = rawBody.length > 0 ? JSON.parse(rawBody) : null;
        } catch {
          parsed = null;
        }

        if (!response.ok) {
          throw new TelegramHttpError({
            status: response.status,
            message: `Telegram HTTP ${response.status}`,
            retryAfterSeconds: readRetryAfter(response.headers, parsed),
            responseBody: rawBody.slice(0, 500),
          });
        }

        if (!isRecord(parsed) || parsed.ok !== true || !isRecord(parsed.result)) {
          throw new TelegramHttpError({
            status: response.status,
            message: 'Telegram response missing result',
            responseBody: rawBody.slice(0, 500),
          });
        }
        const messageId = parsed.result.message_id;
        if (typeof messageId !== 'number' && typeof messageId !== 'string') {
          throw new TelegramHttpError({
            status: response.status,
            message: 'Telegram response missing message_id',
            responseBody: rawBody.slice(0, 500),
          });
        }
        return { messageId: String(messageId) };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
