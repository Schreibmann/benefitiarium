import { Bot, GrammyError, HttpError } from 'grammy';

export type TelegramSendResult = {
  messageId: string;
};

export type TelegramClient = {
  sendMessage: (input: {
    chatId: string;
    text: string;
    threadId?: number | null;
  }) => Promise<TelegramSendResult>;
};

export type TelegramClientOptions = {
  botToken: string;
  /** Optional override for tests — inject a Bot-like sendMessage stub. */
  bot?: {
    api: {
      sendMessage: (
        chatId: string | number,
        text: string,
        other?: {
          message_thread_id?: number;
          parse_mode?: 'HTML';
          link_preview_options?: { is_disabled?: boolean };
        },
      ) => Promise<{ message_id: number | string }>;
    };
  };
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

function mapGrammyError(error: unknown): never {
  if (error instanceof GrammyError) {
    const parameters = error.parameters;
    const retryAfter =
      typeof parameters.retry_after === 'number' && Number.isFinite(parameters.retry_after)
        ? parameters.retry_after
        : null;
    throw new TelegramHttpError({
      status: error.error_code,
      message:
        error.description.length > 0 ? error.description : `Telegram HTTP ${error.error_code}`,
      retryAfterSeconds: retryAfter,
      responseBody: error.description.slice(0, 500),
    });
  }
  if (error instanceof HttpError) {
    throw new TelegramHttpError({
      status: 502,
      message: error.message,
      responseBody: error.message.slice(0, 500),
    });
  }
  if (error instanceof Error) {
    throw new TelegramHttpError({
      status: 502,
      message: error.message,
      responseBody: error.message.slice(0, 500),
    });
  }
  throw new TelegramHttpError({
    status: 502,
    message: 'Telegram send failed',
  });
}

/**
 * Send-only Telegram client via Grammy. Never start long polling.
 * Token must never be logged by callers.
 */
export function createTelegramClient(options: TelegramClientOptions): TelegramClient {
  const token = options.botToken.trim();
  if (token.length === 0) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
  const bot = options.bot ?? new Bot(token);

  return {
    async sendMessage({ chatId, text, threadId }) {
      try {
        const other: {
          message_thread_id?: number;
          parse_mode: 'HTML';
          link_preview_options: { is_disabled: boolean };
        } = {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        };
        if (threadId !== undefined && threadId !== null) {
          other.message_thread_id = threadId;
        }
        const result = await bot.api.sendMessage(chatId, text, other);
        return { messageId: String(result.message_id) };
      } catch (error: unknown) {
        mapGrammyError(error);
      }
    },
  };
}
