import { describe, expect, it, vi } from 'vitest';
import { createTelegramClient } from './telegram-client.js';

describe('createTelegramClient', () => {
  it('sends HTML message and returns message id', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    let capturedMethod = '';
    const fetchImpl: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedMethod = init?.method ?? '';
      capturedBody = typeof init?.body === 'string' ? init.body : '';
      return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const client = createTelegramClient({
      botToken: 'secret-token',
      fetchImpl,
      apiBaseUrl: 'https://example.test',
    });
    const result = await client.sendMessage({ chatId: '-1001', text: '<b>hi</b>' });
    expect(result.messageId).toBe('42');
    expect(capturedUrl).toBe('https://example.test/botsecret-token/sendMessage');
    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toContain('"parse_mode":"HTML"');
  });

  it('maps 429 with retry_after', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: false, parameters: { retry_after: 7 } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'retry-after': '7' },
        }),
    );
    const client = createTelegramClient({ botToken: 't', fetchImpl });
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toMatchObject({
      name: 'TelegramHttpError',
      status: 429,
      retryAfterSeconds: 7,
    });
  });

  it('maps 500 as TelegramHttpError', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('boom', { status: 500, statusText: 'Server Error' }),
    );
    const client = createTelegramClient({ botToken: 't', fetchImpl });
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toMatchObject({
      status: 500,
    });
  });

  it('maps 400 as TelegramHttpError', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('bad', { status: 400, statusText: 'Bad Request' }),
    );
    const client = createTelegramClient({ botToken: 't', fetchImpl });
    await expect(client.sendMessage({ chatId: '1', text: 'x' })).rejects.toMatchObject({
      status: 400,
    });
  });
});
