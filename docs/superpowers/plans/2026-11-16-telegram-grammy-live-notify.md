# Telegram Grammy + Live forum notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cherry-pick BL-106…109, deliver Telegram via Grammy into forum topics (alerts / logs / errors), and wire Live signals into the notifications queue.

**Architecture:** Durable `market_signals` + `notifications` queue; `worker-notifier` sends with Grammy (`message_thread_id`); Live enqueues alerts to alerts topic; platform ops → logs; platform failures → errors. No in-process Bot API from LiveRuntime.

**Tech Stack:** TypeScript monorepo, Postgres persistence, Grammy, Vitest, Biome, pnpm/turbo.

## Global Constraints

- Branch: `cursor/bl-109-grammy-live-notify` (already created from Live tip).
- Spec: `docs/superpowers/specs/2026-11-16-telegram-grammy-live-notify-design.md`.
- Explicitly allowed: `pnpm add grammy` in `apps/worker-notifier`.
- Never log `TELEGRAM_BOT_TOKEN`; no credentials in notification payloads.
- Bilingual docs (RU+EN) for README/STATUS/ADR updates.
- No `any` / type assertions; run `pnpm lint` + `pnpm typecheck` before commits.
- Forum topics: `TELEGRAM_TOPIC_ALERTS`, `TELEGRAM_TOPIC_LOGS`, `TELEGRAM_TOPIC_ERRORS`.

---

### Task 1: Cherry-pick BL-106…109 onto this branch

**Files:**

- Bring from commits `b4ac0f9`, `649f4bc`, `3e9d4c5`, `4d24d57`
- Likely conflict: `docs/ADR/011-*` (Live ADR-011 vs market-triggers ADR-011) → renumber market-triggers to `docs/ADR/012-market-trigger-signals-and-notifications.md`
- Likely conflict: `docs/STATUS.md`, `pnpm-lock.yaml`, package workspace lists

**Interfaces:**

- Produces: `@moex/signal-triggers`, market_signals/notifications repos, `apps/worker-signals`, `apps/worker-notifier` (fetch-based client initially)

- [ ] **Step 1: Cherry-pick in order**

```powershell
git cherry-pick b4ac0f9
# resolve conflicts, continue
git cherry-pick 649f4bc
git cherry-pick 3e9d4c5
git cherry-pick 4d24d57
```

- [ ] **Step 2: On ADR-011 clash, keep Live ADR-011; move market-triggers doc to ADR-012 and fix links**

- [ ] **Step 3: Run `pnpm lint` and `pnpm typecheck`; fix breakages from merge**

- [ ] **Step 4: Commit conflict resolutions if cherry-pick left uncommitted fixes**

```powershell
git commit -m "chore: resolve BL-106..109 cherry-pick onto Live tip"
```

---

### Task 2: Schema follow-up — kinds, thread_id, nullable signal_id

**Files:**

- Create: `packages/persistence/migrations/005_notifications_forum_topics.sql`
- Modify: `packages/persistence/src/repos/market-signals-types.ts`
- Modify: `packages/persistence/src/repos/market-signals.ts`
- Modify: `packages/persistence/src/repos/market-signals-memory.ts`
- Test: `packages/persistence/src/repos/market-signals.test.ts`

**Interfaces:**

- Extends `MarketSignalKind` with `'consolidation' | 'entry_confirm'`
- `Notification` gains `threadId: number | null`
- `signalId: UUID | null` on notifications
- New: `enqueueLogNotification({ id, channel, target, threadId, text })` for logs/errors without signal

- [ ] **Step 1: Write failing tests for new kinds + threadId + log-only notification**

- [ ] **Step 2: Add migration 005 + update types/repos**

- [ ] **Step 3: Run persistence tests; commit**

```powershell
pnpm --filter @moex/persistence test
git add packages/persistence
git commit -m "feat(persistence): forum thread_id and Live signal kinds"
```

---

### Task 3: Config env vars

**Files:**

- Modify: `packages/config/src/env.ts`
- Modify: `packages/config/src/env.test.ts`
- Modify: `.env.example` if present

**Interfaces:**

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ALERTS`, `TELEGRAM_TOPIC_LOGS`, `TELEGRAM_TOPIC_ERRORS`, `NOTIFIER_POLL_MS`

- [ ] **Step 1: Add zod defaults (`''` for strings, poll default 2000)**

- [ ] **Step 2: Update env tests; commit**

```powershell
git commit -m "feat(config): Telegram forum topic env vars"
```

---

### Task 4: Grammy client in worker-notifier

**Files:**

- Modify: `apps/worker-notifier/package.json` (add `grammy`)
- Replace/rewrite: `apps/worker-notifier/src/telegram-client.ts`
- Modify: `apps/worker-notifier/src/telegram-client.test.ts`
- Modify: `apps/worker-notifier/src/poll-loop.ts` (pass `threadId`)
- Modify: `pnpm-lock.yaml` via `pnpm add grammy --filter @moex/worker-notifier`

**Interfaces:**

- `TelegramClient.sendMessage({ chatId, text, threadId?: number | null }) => Promise<{ messageId: string }>`
- Grammy `Bot` send-only; map 429/4xx/5xx like previous client

- [ ] **Step 1: `pnpm add grammy --filter @moex/worker-notifier`**

- [ ] **Step 2: Failing tests asserting `message_thread_id` for alerts vs logs vs errors**

- [ ] **Step 3: Implement Grammy wrapper; update poll loop to pass `notification.threadId`**

- [ ] **Step 4: Run worker-notifier tests; commit**

```powershell
git commit -m "feat(worker-notifier): send via Grammy with forum thread ids"
```

---

### Task 5: Live notifier → notifications queue + logs/errors helpers

**Files:**

- Modify: `apps/api/src/live/telegram-notifier.ts`
- Create: `apps/api/src/notifications/telegram-topic-publisher.ts` (shared logs/errors enqueue)
- Modify: `apps/api/src/compose-market-data.ts` (and/or main compose) to inject repo + env topics
- Modify: `apps/api/src/live/live-runtime.ts` — ops → logs, failures → errors
- Test: `apps/api/src/live/telegram-notifier.test.ts` (new) + adjust `live-runtime.test.ts`

**Interfaces:**

- `createQueueTelegramNotifier({ marketSignals, outbox, chatId, topicAlerts, logger })`
- `createTelegramTopicPublisher({ marketSignals, chatId, topicLogs, topicErrors })` with `publishLog` / `publishError`
- Alerts use `insertSignalWithNotification` + `threadId = topicAlerts`
- Outbox audit payload `delivery: 'notifications_queue'`

- [ ] **Step 1: Failing tests for topic routing (alerts/logs/errors) and missing-env no-throw**

- [ ] **Step 2: Implement queue notifier + topic publisher; wire compose**

- [ ] **Step 3: Hook Live start/stop/degraded → logs; stream/lease hard failures → errors**

- [ ] **Step 4: Run api live tests; commit**

```powershell
git commit -m "feat(live): enqueue Telegram alerts/logs/errors via notifications"
```

---

### Task 6: Docs (RU+EN) + STATUS

**Files:**

- Modify: `README.md` Live algorithm section
- Modify: `docs/ADR/011-independent-live-runtime-shared-stream.md`
- Modify: `docs/ADR/012-market-trigger-signals-and-notifications.md` (Grammy + topics)
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Document three topics, Grammy worker, Live queue wiring**

- [ ] **Step 2: `pnpm lint` + `pnpm typecheck`; commit**

```powershell
git commit -m "docs: Telegram Grammy forum topics and Live notification wiring"
```

---
