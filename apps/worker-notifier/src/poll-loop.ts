import type { MarketSignalsRepository, Notification } from '@moex/persistence';
import type { TelegramClient } from './telegram-client.js';
import { TelegramHttpError } from './telegram-client.js';

export type NotifierPollLoopOptions = {
  repo: MarketSignalsRepository;
  telegram: TelegramClient;
  pollIntervalMs: number;
  throttleMs?: number;
  claimLimit?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  onSent?: (notification: Notification, messageId: string) => void;
  onFailed?: (notification: Notification, error: unknown) => void;
  onIdle?: () => void;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TelegramHttpError) {
    return false;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  ) {
    return true;
  }
  return error instanceof TypeError || error instanceof Error;
}

export type NotifierPollLoop = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
};

export function createNotifierPollLoop(options: NotifierPollLoopOptions): NotifierPollLoop {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => new Date());
  const throttleMs = options.throttleMs ?? 1000;
  const claimLimit = options.claimLimit ?? 10;
  let running = false;
  let loop: Promise<void> | null = null;
  let wake: (() => void) | null = null;

  async function interruptibleSleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (wake === finish) {
          wake = null;
        }
        resolve();
      };
      wake = finish;
      void sleep(ms).then(finish);
    });
  }

  async function deliverOne(notification: Notification): Promise<void> {
    try {
      const result = await options.telegram.sendMessage({
        chatId: notification.target,
        text: notification.text,
      });
      await options.repo.markSent(notification.id, {
        providerMessageId: result.messageId,
        sentAt: now().toISOString(),
      });
      options.onSent?.(notification, result.messageId);
    } catch (error: unknown) {
      if (error instanceof TelegramHttpError) {
        if (error.status === 429) {
          await options.repo.markFailed(notification.id, {
            errorMessage: error.message,
            ...(error.retryAfterSeconds !== null
              ? { retryAfterSeconds: error.retryAfterSeconds }
              : {}),
          });
        } else if (error.status >= 500) {
          await options.repo.markFailed(notification.id, {
            errorMessage: error.message,
          });
        } else {
          await options.repo.markFailed(notification.id, {
            errorMessage: error.message,
            dead: true,
          });
        }
      } else if (isNetworkError(error)) {
        await options.repo.markFailed(notification.id, {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } else {
        await options.repo.markFailed(notification.id, {
          errorMessage: error instanceof Error ? error.message : String(error),
          dead: true,
        });
      }
      options.onFailed?.(notification, error);
    }
  }

  async function run(): Promise<void> {
    while (running) {
      const due = await options.repo.claimDueNotifications(claimLimit);
      if (due.length === 0) {
        options.onIdle?.();
        await interruptibleSleep(options.pollIntervalMs);
        continue;
      }
      for (const notification of due) {
        if (!running) {
          return;
        }
        await deliverOne(notification);
        if (!running) {
          return;
        }
        await interruptibleSleep(throttleMs);
      }
    }
  }

  return {
    async start() {
      if (running) {
        return;
      }
      running = true;
      loop = run();
    },
    async stop() {
      running = false;
      wake?.();
      wake = null;
      if (loop !== null) {
        try {
          await loop;
        } catch {
          // swallow on stop
        }
        loop = null;
      }
    },
    isRunning() {
      return running;
    },
  };
}
