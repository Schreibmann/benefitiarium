import { describe, expect, it } from 'vitest';
import {
  loadEnv,
  parseTelegramTopicId,
  requireTinvestToken,
  resolveTelegramChatId,
  resolveTinvestSandboxAccountId,
  resolveTinvestToken,
} from './env.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/moex',
};

describe('loadEnv', () => {
  it('loads defaults for non-secret values', () => {
    const env = loadEnv(baseEnv);
    expect(env.TRADING_MODE).toBe('research');
    expect(env.LIVE_TRADING_ENABLED).toBe(false);
    expect(env.LIVE_CANDLE_STREAM_LOG).toBe(false);
    expect(env.GLOBAL_KILL_SWITCH).toBe(true);
    expect(env.TINVEST_ENV).toBe('sandbox');
    expect(env.MOEX_ISS_AUTH_MODE).toBe('anonymous');
    expect(env.MOEX_ISS_TOKEN).toBe('');
    expect(env.TINVEST_SANDBOX_TOKEN).toBe('');
    expect(env.TINVEST_READ_ONLY_TOKEN).toBe('');
    expect(env.SIGNALS_TIMEFRAMES).toBe('5m,1h');
    expect(env.SIGNALS_EVAL_MODE).toBe('close');
    expect(env.TELEGRAM_BOT_TOKEN).toBe('');
    expect(env.TELEGRAM_CHAT_ID).toBe('');
    expect(env.TELEGRAM_CHANNEL_ID).toBe('');
    expect(env.TELEGRAM_TOPIC_ALERTS).toBe('');
    expect(env.TELEGRAM_TOPIC_LOGS).toBe('');
    expect(env.TELEGRAM_TOPIC_ERRORS).toBe('');
    expect(env.NOTIFIER_POLL_MS).toBe(2000);
  });

  it('resolves TELEGRAM_CHAT_ID over legacy CHANNEL_ID', () => {
    expect(resolveTelegramChatId(loadEnv(baseEnv))).toBeNull();
    expect(
      resolveTelegramChatId(loadEnv({ ...baseEnv, TELEGRAM_CHANNEL_ID: ' -100legacy ' })),
    ).toBe('-100legacy');
    expect(
      resolveTelegramChatId(
        loadEnv({
          ...baseEnv,
          TELEGRAM_CHAT_ID: ' -100chat ',
          TELEGRAM_CHANNEL_ID: '-100legacy',
        }),
      ),
    ).toBe('-100chat');
    expect(resolveTelegramChatId(loadEnv({ ...baseEnv, TELEGRAM_CHAT_ID: '3917086438' }))).toBe(
      '-1003917086438',
    );
  });

  it('parses Telegram topic thread ids', () => {
    expect(parseTelegramTopicId('')).toBeNull();
    expect(parseTelegramTopicId(' 42 ')).toBe(42);
    expect(parseTelegramTopicId('0')).toBeNull();
    expect(parseTelegramTopicId('-1')).toBeNull();
    expect(parseTelegramTopicId('abc')).toBeNull();
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('parses boolean flags from strings', () => {
    const env = loadEnv({
      ...baseEnv,
      LIVE_TRADING_ENABLED: 'true',
      LIVE_CANDLE_STREAM_LOG: 'true',
      GLOBAL_KILL_SWITCH: 'false',
    });
    expect(env.LIVE_TRADING_ENABLED).toBe(true);
    expect(env.LIVE_CANDLE_STREAM_LOG).toBe(true);
    expect(env.GLOBAL_KILL_SWITCH).toBe(false);
  });

  it('resolves sandbox and read-only tokens separately', () => {
    const env = loadEnv({
      ...baseEnv,
      TINVEST_SANDBOX_TOKEN: ' sandbox-secret ',
      TINVEST_READ_ONLY_TOKEN: ' readonly-secret ',
    });
    expect(resolveTinvestToken(env, 'sandbox')).toBe('sandbox-secret');
    expect(resolveTinvestToken(env, 'read_only')).toBe('readonly-secret');
    expect(requireTinvestToken(env, 'sandbox')).toBe('sandbox-secret');
  });

  it('requireTinvestToken fails with the correct env key name', () => {
    const env = loadEnv(baseEnv);
    expect(() => requireTinvestToken(env, 'sandbox')).toThrow(/TINVEST_SANDBOX_TOKEN/);
    expect(() => requireTinvestToken(env, 'read_only')).toThrow(/TINVEST_READ_ONLY_TOKEN/);
  });

  it('prefers TINVEST_SANDBOX_ACCOUNT_ID over legacy TINVEST_ACCOUNT_ID', () => {
    const env = loadEnv({
      ...baseEnv,
      TINVEST_SANDBOX_ACCOUNT_ID: 'sandbox-primary',
      TINVEST_ACCOUNT_ID: 'legacy',
    });
    expect(resolveTinvestSandboxAccountId(env)).toBe('sandbox-primary');
    expect(
      resolveTinvestSandboxAccountId(loadEnv({ ...baseEnv, TINVEST_ACCOUNT_ID: 'legacy' })),
    ).toBe('legacy');
  });
});
