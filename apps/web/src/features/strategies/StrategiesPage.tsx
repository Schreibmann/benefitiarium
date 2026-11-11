import { type FormEvent, useId, useState } from 'react';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { FormField, Input } from '../../shared/ui/Input.js';
import {
  createDefaultStrategyFilters,
  createEmptyStrategyDraft,
  filterStrategies,
  type StrategyDraft,
  type StrategyFilters,
  type StrategyListItem,
  strategyModeLabel,
  strategyModeTone,
  strategyStatusLabel,
  strategyStatusTone,
  validateStrategyDraft,
} from './strategy-types.js';
import './strategies-page.css';

type Props = {
  items?: readonly StrategyListItem[];
};

const MODE_OPTIONS: Array<StrategyFilters['mode']> = [
  'all',
  'monitoring',
  'paper',
  'sandbox',
  'live',
];
const STATUS_OPTIONS: Array<StrategyFilters['status']> = [
  'all',
  'draft',
  'ready',
  'running',
  'paused',
  'error',
  'stopped',
];
const DRAFT_MODE_OPTIONS: Array<StrategyDraft['mode']> = ['monitoring', 'paper', 'sandbox', 'live'];
const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '1h', '1d'];

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function StrategyListRow(props: {
  item: StrategyListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const className = props.selected
    ? 'strategies-page__list-item strategies-page__list-item--active'
    : 'strategies-page__list-item';

  return (
    <li>
      <button
        type="button"
        className={className}
        aria-pressed={props.selected}
        onClick={() => props.onSelect(props.item.id)}
      >
        <div className="strategies-page__row">
          <p className="strategies-page__name">{props.item.name}</p>
          <div className="strategies-page__row">
            <Badge tone={strategyModeTone(props.item.mode)}>
              {strategyModeLabel(props.item.mode)}
            </Badge>
            <Badge tone={strategyStatusTone(props.item.status)}>
              {strategyStatusLabel(props.item.status)}
            </Badge>
          </div>
        </div>
        <p className="strategies-page__meta">
          {props.item.ticker} · {props.item.timeframe} · обновлено{' '}
          {formatUpdatedAt(props.item.updatedAtIso)}
        </p>
        <p className="strategies-page__meta">{props.item.lastEvent}</p>
      </button>
    </li>
  );
}

function StrategyDetailPanel(props: { item: StrategyListItem | null }) {
  if (props.item === null) {
    return (
      <EmptyState
        title="Выберите стратегию"
        description="Настройки, режим исполнения и статус появятся здесь. Пустой список — без DEMO DATA."
      />
    );
  }

  const item = props.item;

  return (
    <div className="strategies-page__detail-grid">
      <div className="strategies-page__row">
        <Badge tone={strategyModeTone(item.mode)}>{strategyModeLabel(item.mode)}</Badge>
        <Badge tone={strategyStatusTone(item.status)}>{strategyStatusLabel(item.status)}</Badge>
      </div>
      <dl>
        <div className="strategies-page__detail-row">
          <dt>Название</dt>
          <dd>{item.name}</dd>
        </div>
        <div className="strategies-page__detail-row">
          <dt>Инструмент</dt>
          <dd>
            {item.ticker} · {item.timeframe}
          </dd>
        </div>
        <div className="strategies-page__detail-row">
          <dt>Последнее событие</dt>
          <dd>{item.lastEvent}</dd>
        </div>
        <div className="strategies-page__detail-row">
          <dt>Обновлено</dt>
          <dd>{formatUpdatedAt(item.updatedAtIso)} · Europe/Moscow</dd>
        </div>
      </dl>
      <p className="strategies-page__note">
        Редактирование параметров и смена режима появятся после подключения strategy-engine API.
        LIVE потребует отдельного подтверждения.
      </p>
      <div className="strategies-page__actions">
        <Button href="/app/signals" variant="secondary" size="sm">
          К сигналам
        </Button>
        <Button href="/app/backtesting" variant="ghost" size="sm">
          Backtesting
        </Button>
      </div>
    </div>
  );
}

export function StrategiesPage(props: Props) {
  const items = props.items ?? [];
  const [filters, setFilters] = useState<StrategyFilters>(() => createDefaultStrategyFilters());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<StrategyDraft>(() => createEmptyStrategyDraft());
  const [draftErrors, setDraftErrors] = useState<{ name?: string; ticker?: string }>({});
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const nameFilterId = useId();
  const tickerFilterId = useId();
  const modeFilterId = useId();
  const statusFilterId = useId();
  const draftNameId = useId();
  const draftTickerId = useId();
  const draftTimeframeId = useId();
  const draftModeId = useId();

  const visible = filterStrategies(items, filters);
  const selected =
    selectedId === null ? null : (visible.find((item) => item.id === selectedId) ?? null);

  function updateFilter<K extends keyof StrategyFilters>(key: K, value: StrategyFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedId(null);
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateStrategyDraft(draft);
    const nextErrors: { name?: string; ticker?: string } = {};
    if (validation.nameError !== undefined) {
      nextErrors.name = validation.nameError;
    }
    if (validation.tickerError !== undefined) {
      nextErrors.ticker = validation.tickerError;
    }
    setDraftErrors(nextErrors);
    if (!validation.ok) {
      setCreateMessage(null);
      return;
    }
    setCreateMessage(
      'Черновик проверен локально. Сохранение и запуск появятся после подключения strategy-engine — список не заполняется выдуманными стратегиями.',
    );
  }

  return (
    <section className="strategies-page" aria-labelledby="strategies-page-title">
      <div className="strategies-page__toolbar">
        <div>
          <h2 id="strategies-page-title" className="strategies-page__heading">
            Стратегии
          </h2>
          <p className="strategies-page__lede">
            Создание, настройки, режим исполнения и статусы. MONITORING / PAPER / SANDBOX / LIVE
            различимы текстом и бейджем, не только цветом.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setCreateOpen(true);
            setCreateMessage(null);
          }}
        >
          Создать стратегию
        </Button>
      </div>

      <div className="strategies-page__modes">
        <Card>
          <CardHeader title="MONITORING" action={<Badge tone="brand">ANALYSIS</Badge>} />
          <CardBody>
            <p className="strategies-page__mode-copy">
              Только анализ и сигналы. Заявки не отправляются.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="PAPER" action={<Badge tone="neutral">SIM</Badge>} />
          <CardBody>
            <p className="strategies-page__mode-copy">
              Внутренний симулятор исполнения без брокера.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="SANDBOX" action={<Badge tone="info">TEST</Badge>} />
          <CardBody>
            <p className="strategies-page__mode-copy">
              Заявки в тестовое окружение брокера. Не путать с LIVE.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="LIVE" action={<Badge tone="warning">REAL</Badge>} />
          <CardBody>
            <p className="strategies-page__mode-copy">
              Реальные операции. Потребует отдельного подтверждения.
            </p>
          </CardBody>
        </Card>
      </div>

      {createOpen ? (
        <Card>
          <CardHeader
            title="Новая стратегия"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreateOpen(false);
                  setDraft(createEmptyStrategyDraft());
                  setDraftErrors({});
                  setCreateMessage(null);
                }}
              >
                Закрыть
              </Button>
            }
          />
          <CardBody>
            <form className="strategies-page__form" onSubmit={onCreateSubmit} noValidate>
              <div className="strategies-page__form-grid">
                <FormField
                  label="Название"
                  htmlFor={draftNameId}
                  {...(draftErrors.name !== undefined ? { error: draftErrors.name } : {})}
                >
                  <Input
                    id={draftNameId}
                    value={draft.name}
                    placeholder="Breakout A"
                    invalid={draftErrors.name !== undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </FormField>
                <FormField
                  label="Тикер"
                  htmlFor={draftTickerId}
                  {...(draftErrors.ticker !== undefined ? { error: draftErrors.ticker } : {})}
                >
                  <Input
                    id={draftTickerId}
                    value={draft.ticker}
                    placeholder="SBER"
                    invalid={draftErrors.ticker !== undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, ticker: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Timeframe" htmlFor={draftTimeframeId}>
                  <select
                    id={draftTimeframeId}
                    className="ui-input"
                    value={draft.timeframe}
                    onChange={(event) => {
                      const value = event.target.value;
                      for (const option of TIMEFRAME_OPTIONS) {
                        if (option === value) {
                          setDraft((prev) => ({ ...prev, timeframe: option }));
                          return;
                        }
                      }
                    }}
                  >
                    {TIMEFRAME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Режим" htmlFor={draftModeId}>
                  <select
                    id={draftModeId}
                    className="ui-input"
                    value={draft.mode}
                    onChange={(event) => {
                      const value = event.target.value;
                      for (const option of DRAFT_MODE_OPTIONS) {
                        if (option === value) {
                          setDraft((prev) => ({ ...prev, mode: option }));
                          return;
                        }
                      }
                    }}
                  >
                    {DRAFT_MODE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {strategyModeLabel(option)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="strategies-page__actions">
                <Button type="submit" size="sm">
                  Проверить черновик
                </Button>
                <Button href="/app/backtesting" variant="ghost" size="sm">
                  Сначала backtest
                </Button>
              </div>
              {createMessage !== null ? (
                <p className="strategies-page__note" role="status">
                  {createMessage}
                </p>
              ) : null}
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Фильтры" />
        <CardBody>
          <div className="strategies-page__filters">
            <FormField label="Название" htmlFor={nameFilterId}>
              <Input
                id={nameFilterId}
                value={filters.nameQuery}
                placeholder="Breakout"
                onChange={(event) => updateFilter('nameQuery', event.target.value)}
              />
            </FormField>
            <FormField label="Тикер" htmlFor={tickerFilterId}>
              <Input
                id={tickerFilterId}
                value={filters.tickerQuery}
                placeholder="SBER"
                onChange={(event) => updateFilter('tickerQuery', event.target.value)}
              />
            </FormField>
            <FormField label="Режим" htmlFor={modeFilterId}>
              <select
                id={modeFilterId}
                className="ui-input"
                value={filters.mode}
                onChange={(event) => {
                  const value = event.target.value;
                  for (const option of MODE_OPTIONS) {
                    if (option === value) {
                      updateFilter('mode', option);
                      return;
                    }
                  }
                }}
              >
                <option value="all">Все</option>
                <option value="monitoring">MONITORING</option>
                <option value="paper">PAPER</option>
                <option value="sandbox">SANDBOX</option>
                <option value="live">LIVE</option>
              </select>
            </FormField>
            <FormField label="Статус" htmlFor={statusFilterId}>
              <select
                id={statusFilterId}
                className="ui-input"
                value={filters.status}
                onChange={(event) => {
                  const value = event.target.value;
                  for (const option of STATUS_OPTIONS) {
                    if (option === value) {
                      updateFilter('status', option);
                      return;
                    }
                  }
                }}
              >
                <option value="all">Все</option>
                <option value="draft">DRAFT</option>
                <option value="ready">READY</option>
                <option value="running">RUNNING</option>
                <option value="paused">PAUSED</option>
                <option value="error">ERROR</option>
                <option value="stopped">STOPPED</option>
              </select>
            </FormField>
          </div>
        </CardBody>
      </Card>

      <div className="strategies-page__layout">
        <Card>
          <CardHeader
            title="Мои стратегии"
            action={
              <Badge tone="neutral">
                {visible.length === 0 ? 'EMPTY' : String(visible.length)}
              </Badge>
            }
          />
          <CardBody>
            {visible.length === 0 ? (
              <EmptyState
                title="Стратегии ещё не созданы"
                description="Список пуст до подключения strategy-engine. Режимы и статусы уже размечены в UI — без выдуманных запусков."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateOpen(true);
                      setCreateMessage(null);
                    }}
                  >
                    Создать стратегию
                  </Button>
                }
                secondaryAction={
                  <Button href="/app/signals" variant="ghost" size="sm">
                    К сигналам
                  </Button>
                }
              />
            ) : (
              <ul className="strategies-page__list">
                {visible.map((item) => (
                  <StrategyListRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={setSelectedId}
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Настройки и статус" action={<Badge tone="brand">STRATEGY</Badge>} />
          <CardBody>
            <StrategyDetailPanel item={selected} />
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
