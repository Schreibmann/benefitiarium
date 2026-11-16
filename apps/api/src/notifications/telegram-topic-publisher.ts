import { randomUUID } from 'node:crypto';
import { parseUuid } from '@moex/domain';
import type { MarketSignalsRepository } from '@moex/persistence';

export type TelegramTopicPublisher = {
  publishLog: (
    message: string,
    fields?: Record<string, string | number | boolean | null>,
  ) => Promise<void>;
  publishError: (
    message: string,
    fields?: Record<string, string | number | boolean | null>,
  ) => Promise<void>;
};

export type TelegramTopicPublisherLogger = {
  warn: (
    message: string,
    fields?: Record<string, string | number | boolean | null | undefined>,
  ) => void;
};

export type TelegramTopicPublisherOptions = {
  marketSignals: MarketSignalsRepository;
  chatId: string | null;
  topicLogs: number | null;
  topicErrors: number | null;
  createId?: () => string;
  logger?: TelegramTopicPublisherLogger;
};

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function formatFields(
  fields: Record<string, string | number | boolean | null> | undefined,
): string {
  if (fields === undefined) {
    return '';
  }
  const parts: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) {
      continue;
    }
    parts.push(`${escapeHtml(key)}=<code>${escapeHtml(String(value))}</code>`);
  }
  if (parts.length === 0) {
    return '';
  }
  return `\n${parts.join(' · ')}`;
}

/**
 * Shared enqueue helper for ops logs (LOGS topic) and platform errors (ERRORS topic).
 * No-ops when chat/topic env is missing so callers never throw for missing Telegram config.
 */
export function createTelegramTopicPublisher(
  options: TelegramTopicPublisherOptions,
): TelegramTopicPublisher {
  const createId = options.createId ?? (() => randomUUID());

  const enqueue = async (
    threadId: number | null,
    prefix: string,
    message: string,
    fields?: Record<string, string | number | boolean | null>,
  ): Promise<void> => {
    const chatId = options.chatId;
    if (chatId === null || threadId === null) {
      return;
    }
    const text = `<b>${escapeHtml(prefix)}</b> ${escapeHtml(message)}${formatFields(fields)}`;
    try {
      await options.marketSignals.enqueueLogNotification({
        id: parseUuid(createId()),
        channel: 'telegram',
        target: chatId,
        threadId,
        text,
      });
    } catch (error: unknown) {
      options.logger?.warn('telegram topic enqueue failed', {
        prefix,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  return {
    publishLog: (message, fields) => enqueue(options.topicLogs, 'LOG', message, fields),
    publishError: (message, fields) => enqueue(options.topicErrors, 'ERROR', message, fields),
  };
}
