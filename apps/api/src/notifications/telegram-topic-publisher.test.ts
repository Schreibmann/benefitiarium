import { createMemoryMarketSignalsStore } from '@moex/persistence';
import { describe, expect, it } from 'vitest';
import { createTelegramTopicPublisher } from './telegram-topic-publisher.js';

describe('createTelegramTopicPublisher', () => {
  it('enqueues log and error notifications into distinct topics', async () => {
    const store = createMemoryMarketSignalsStore(() => new Date('2026-11-16T12:00:00.000Z'));
    let n = 0;
    const publisher = createTelegramTopicPublisher({
      marketSignals: store,
      chatId: '-1001',
      topicLogs: 10,
      topicErrors: 20,
      createId: () => `00000000-0000-4000-8000-00000000000${++n}`,
    });

    await publisher.publishLog('live started', { status: 'RUNNING' });
    await publisher.publishError('stream failed', { reason: 'timeout' });

    const rows = store.snapshotNotifications();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.threadId).toBe(10);
    expect(rows[0]?.signalId).toBeNull();
    expect(rows[0]?.text).toContain('<b>LOG</b>');
    expect(rows[0]?.text).toContain('live started');
    expect(rows[1]?.threadId).toBe(20);
    expect(rows[1]?.text).toContain('<b>ERROR</b>');
    expect(rows[1]?.text).toContain('stream failed');
  });

  it('no-ops when chat or topic env is missing', async () => {
    const store = createMemoryMarketSignalsStore();
    const publisher = createTelegramTopicPublisher({
      marketSignals: store,
      chatId: null,
      topicLogs: 10,
      topicErrors: 20,
    });
    await publisher.publishLog('ignored');
    await publisher.publishError('ignored');
    expect(store.snapshotNotifications()).toHaveLength(0);

    const partial = createTelegramTopicPublisher({
      marketSignals: store,
      chatId: '-1001',
      topicLogs: null,
      topicErrors: null,
    });
    await partial.publishLog('ignored');
    await partial.publishError('ignored');
    expect(store.snapshotNotifications()).toHaveLength(0);
  });

  it('escapes HTML in message and fields', async () => {
    const store = createMemoryMarketSignalsStore();
    const publisher = createTelegramTopicPublisher({
      marketSignals: store,
      chatId: '-1001',
      topicLogs: 1,
      topicErrors: 2,
      createId: () => '00000000-0000-4000-8000-000000000099',
    });
    await publisher.publishLog('a <b>tag</b> & more', { err: '<boom>' });
    const text = store.snapshotNotifications()[0]?.text ?? '';
    expect(text).toContain('&lt;b&gt;');
    expect(text).toContain('&amp;');
    expect(text).toContain('&lt;boom&gt;');
  });
});
