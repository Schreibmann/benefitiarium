import { GrammyError } from 'grammy';
import { describe, expect, it, vi } from 'vitest';
import { createTelegramClient, TelegramHttpError } from './telegram-client.js';

describe('createTelegramClient', () => {
  it('sends HTML message with thread id and returns message id', async () => {
    const sendMessage = vi.fn(async () => ({ message_id: 42 }));
    const client = createTelegramClient({
      botToken: 'secret-token',
      bot: { api: { sendMessage } },
    });
    const result = await client.sendMessage({
      chatId: '-1001',
      text: '<b>hi</b>',
      threadId: 17,
    });
    expect(result.messageId).toBe('42');
    expect(sendMessage).toHaveBeenCalledWith('-1001', '<b>hi</b>', {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      message_thread_id: 17,
    });
  });

  it('maps 429 with retry_after', async () => {
    const error = new GrammyError(
      'Too Many Requests: retry after 7',
      {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests: retry after 7',
        parameters: { retry_after: 7 },
      },
      'sendMessage',
      {},
    );
    const client = createTelegramClient({
      botToken: 't',
      bot: {
        api: {
          sendMessage: async () => {
            throw error;
          },
        },
      },
    });
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toMatchObject({
      name: 'TelegramHttpError',
      status: 429,
      retryAfterSeconds: 7,
    });
  });

  it('maps 500 as TelegramHttpError', async () => {
    const error = new GrammyError(
      'Internal Server Error',
      { ok: false, error_code: 500, description: 'Internal Server Error' },
      'sendMessage',
      {},
    );
    const client = createTelegramClient({
      botToken: 't',
      bot: {
        api: {
          sendMessage: async () => {
            throw error;
          },
        },
      },
    });
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toBeInstanceOf(
      TelegramHttpError,
    );
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toMatchObject({
      status: 500,
    });
  });

  it('maps 400 as TelegramHttpError', async () => {
    const error = new GrammyError(
      'Bad Request',
      { ok: false, error_code: 400, description: 'Bad Request' },
      'sendMessage',
      {},
    );
    const client = createTelegramClient({
      botToken: 't',
      bot: {
        api: {
          sendMessage: async () => {
            throw error;
          },
        },
      },
    });
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toMatchObject({
      status: 400,
    });
  });
});
