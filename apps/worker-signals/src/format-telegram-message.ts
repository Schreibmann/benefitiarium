import type { TriggerHit } from '@moex/signal-triggers';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function roundDisplay(raw: string): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return raw;
  }
  return value.toFixed(2);
}

function kindLabel(hit: TriggerHit): string {
  if (hit.kind === 'cross') {
    return hit.side === 'up' ? 'пересечение вверх' : 'пересечение вниз';
  }
  return hit.side === 'above' ? 'приближение сверху' : 'приближение снизу';
}

function formatMoscowTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatTelegramMessage(input: {
  hit: TriggerHit;
  ticker: string | null;
  name?: string | null;
  timeframe: string;
  timeZone: string;
}): string {
  const ticker = escapeHtml(input.ticker ?? input.hit.periodId);
  const kind = escapeHtml(kindLabel(input.hit));
  const level = escapeHtml(input.hit.levelName);
  const levelValue = escapeHtml(roundDisplay(input.hit.levelValue));
  const price = escapeHtml(roundDisplay(input.hit.price));
  const timeframe = escapeHtml(input.timeframe);
  const when = escapeHtml(formatMoscowTime(input.hit.candleTimeStart, input.timeZone));
  const name = input.name?.trim() ?? '';
  const heading =
    name.length > 0 && name !== input.ticker
      ? `<b>${ticker}</b> · ${escapeHtml(name)} · ${timeframe}`
      : `<b>${ticker}</b> · ${timeframe}`;

  return [
    heading,
    `${kind} · уровень <b>${level}</b> = <code>${levelValue}</code>`,
    `цена <code>${price}</code>`,
    `свеча ${when} (MSK)`,
  ].join('\n');
}
