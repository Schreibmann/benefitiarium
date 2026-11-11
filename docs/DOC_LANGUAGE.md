# Язык документации / Documentation language

**RU.** Вся проектная документация ведётся **на русском и английском в одном файле**. Отдельные `*.ru.md` / `*.en.md` не создаём.

**EN.** All project documentation is maintained **in Russian and English in the same file**. Do not create separate `*.ru.md` / `*.en.md` twins.

## Формат / Format

1. Заголовки двуязычные: `## Section / Раздел`.
2. Абзацы парами с метками **RU.** и **EN.** (или эквивалентное явное парное оформление).
3. Идентификаторы кода, пути, env, API routes **не переводятся**.
4. После любого изменения docs оба языка обновляются в том же PR/коммите.

5. Headings are bilingual: `## Section / Раздел`.
6. Body paragraphs are paired with **RU.** and **EN.** labels (or an equally clear pairing).
7. Code identifiers, paths, env vars, and API routes are **not** translated.
8. After any docs change, both languages are updated in the same PR/commit.

## Чтение агентами / Agent reading

**RU.** При работе (реализация, исследование) агенты читают **только английский** (`**EN.**`), чтобы не дублировать контекст. Русский обновляют при правках docs, но не тащат в рабочий контекст.

**EN.** When working (implementation, research), agents read **English only** (`**EN.**`) so context is not doubled. Russian is still updated on doc edits, but must not be loaded into the working context.

## Область / Scope

- Root: `README.md`, `ROADMAP.md`, `BACKLOG.md`
- `docs/**` (STATUS, ROADMAP, backlog, contracts, security, ADR, realtime, plans/specs)
- `infra/**/*.md`
- Cursor rule: `.cursor/rules/docs-bilingual.mdc`
