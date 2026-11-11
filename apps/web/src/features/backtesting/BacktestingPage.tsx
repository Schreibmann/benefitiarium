import { type FormEvent, useId, useState } from 'react';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { FormField, Input } from '../../shared/ui/Input.js';
import {
  type BacktestFilters,
  type BacktestParams,
  type BacktestRunSummary,
  backtestStatusLabel,
  backtestStatusTone,
  compareRunIdsForSelection,
  createDefaultBacktestFilters,
  createDefaultBacktestParams,
  filterBacktestRuns,
  validateBacktestParams,
} from './backtest-types.js';
import './backtesting-page.css';

type Props = {
  runs?: readonly BacktestRunSummary[];
};

const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '1h', '1d'];
const STATUS_OPTIONS: Array<BacktestFilters['status']> = [
  'all',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
];
const COMPARE_LIMIT = 2;

const METRIC_SLOTS = ['Total return', 'Max drawdown', 'Sharpe', 'Trades'];

function formatCreatedAt(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function RunListRow(props: {
  item: BacktestRunSummary;
  selected: boolean;
  compared: boolean;
  onSelect: (id: string) => void;
  onToggleCompare: (id: string) => void;
}) {
  const className = props.selected
    ? 'backtesting-page__list-item backtesting-page__list-item--active'
    : 'backtesting-page__list-item';

  return (
    <li>
      <button
        type="button"
        className={className}
        aria-pressed={props.selected}
        onClick={() => props.onSelect(props.item.id)}
      >
        <div className="backtesting-page__row">
          <p className="backtesting-page__name">{props.item.strategyName}</p>
          <Badge tone={backtestStatusTone(props.item.status)}>
            {backtestStatusLabel(props.item.status)}
          </Badge>
        </div>
        <p className="backtesting-page__meta">
          {props.item.ticker} · {props.item.timeframe} · {props.item.fromDate} → {props.item.toDate}
        </p>
        <p className="backtesting-page__meta">
          Создан {formatCreatedAt(props.item.createdAtIso)}
          {props.item.progressPercent !== null ? ` · прогресс ${props.item.progressPercent}%` : ''}
        </p>
      </button>
      <div className="backtesting-page__actions">
        <Button
          type="button"
          variant={props.compared ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => props.onToggleCompare(props.item.id)}
        >
          {props.compared ? 'В сравнении' : 'Сравнить'}
        </Button>
      </div>
    </li>
  );
}

function RunDetailPanel(props: { item: BacktestRunSummary | null; compareCount: number }) {
  if (props.item === null) {
    return (
      <EmptyState
        title="Выберите прогон"
        description="Прогресс, метрики и equity появятся после реального backtest run. Без выдуманной доходности."
      />
    );
  }

  const item = props.item;
  const progressWidth =
    item.progressPercent === null ? '0%' : `${Math.max(0, Math.min(100, item.progressPercent))}%`;

  return (
    <div className="backtesting-page__progress">
      <div className="backtesting-page__row">
        <Badge tone={backtestStatusTone(item.status)}>{backtestStatusLabel(item.status)}</Badge>
        <Badge tone="neutral">
          {props.compareCount === 0
            ? 'COMPARE EMPTY'
            : `COMPARE ${props.compareCount}/${COMPARE_LIMIT}`}
        </Badge>
      </div>

      <div>
        <p className="backtesting-page__meta">Прогресс</p>
        <div
          className="backtesting-page__progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={item.progressPercent ?? 0}
          aria-label="Прогресс backtest"
        >
          <div className="backtesting-page__progress-fill" style={{ width: progressWidth }} />
        </div>
        <p className="backtesting-page__note">
          {item.progressPercent === null
            ? 'Прогресс недоступен — прогон ещё не стартовал на worker-backtest.'
            : `Локальная разметка прогресса: ${item.progressPercent}%.`}
        </p>
      </div>

      <div>
        <p className="backtesting-page__meta">Метрики</p>
        <div className="backtesting-page__metrics">
          {METRIC_SLOTS.map((label) => (
            <article key={label} className="backtesting-page__metric">
              <p className="backtesting-page__metric-label">{label}</p>
              <p className="backtesting-page__metric-value">
                {item.metricsAvailable ? 'Ожидает API' : 'Нет данных'}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <p className="backtesting-page__meta">Equity curve</p>
        <div className="backtesting-page__equity">
          <EmptyState
            title="График equity пуст"
            description="Кривая капитала появится после успешного прогона. DEMO DATA не подмешивается."
          />
        </div>
      </div>

      <p className="backtesting-page__note">
        Сравнение запусков: отметьте до двух прогонов в списке. Числовые diff-метрики — после
        backend.
      </p>
    </div>
  );
}

export function BacktestingPage(props: Props) {
  const runs = props.runs ?? [];
  const [params, setParams] = useState<BacktestParams>(() => createDefaultBacktestParams());
  const [filters, setFilters] = useState<BacktestFilters>(() => createDefaultBacktestFilters());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [paramErrors, setParamErrors] = useState<{
    strategy?: string;
    ticker?: string;
    range?: string;
  }>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const strategyId = useId();
  const tickerId = useId();
  const timeframeId = useId();
  const fromId = useId();
  const toId = useId();
  const cashId = useId();
  const strategyFilterId = useId();
  const tickerFilterId = useId();
  const statusFilterId = useId();

  const visible = filterBacktestRuns(runs, filters);
  const selected =
    selectedId === null ? null : (visible.find((item) => item.id === selectedId) ?? null);

  function updateFilter<K extends keyof BacktestFilters>(key: K, value: BacktestFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedId(null);
  }

  function onSubmitParams(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateBacktestParams(params);
    const nextErrors: { strategy?: string; ticker?: string; range?: string } = {};
    if (validation.strategyError !== undefined) {
      nextErrors.strategy = validation.strategyError;
    }
    if (validation.tickerError !== undefined) {
      nextErrors.ticker = validation.tickerError;
    }
    if (validation.rangeError !== undefined) {
      nextErrors.range = validation.rangeError;
    }
    setParamErrors(nextErrors);
    if (!validation.ok) {
      setSubmitMessage(null);
      return;
    }
    setSubmitMessage(
      'Параметры проверены локально. Запуск на worker-backtest появится после API — список прогонов не заполняется выдуманными результатами.',
    );
  }

  return (
    <section className="backtesting-page" aria-labelledby="backtesting-page-title">
      <div className="backtesting-page__toolbar">
        <div>
          <h2 id="backtesting-page-title" className="backtesting-page__heading">
            Backtesting
          </h2>
          <p className="backtesting-page__lede">
            Параметры теста, прогресс, метрики, equity и сравнение запусков. Пустые слоты вместо
            фиктивной доходности.
          </p>
        </div>
        <Button href="/app/strategies" variant="secondary" size="sm">
          К стратегиям
        </Button>
      </div>

      <Card>
        <CardHeader title="Параметры теста" action={<Badge tone="brand">PARAMS</Badge>} />
        <CardBody>
          <form className="backtesting-page__form" onSubmit={onSubmitParams} noValidate>
            <div className="backtesting-page__params">
              <FormField
                label="Стратегия"
                htmlFor={strategyId}
                {...(paramErrors.strategy !== undefined ? { error: paramErrors.strategy } : {})}
              >
                <Input
                  id={strategyId}
                  value={params.strategyName}
                  placeholder="Breakout A"
                  invalid={paramErrors.strategy !== undefined}
                  onChange={(event) =>
                    setParams((prev) => ({ ...prev, strategyName: event.target.value }))
                  }
                />
              </FormField>
              <FormField
                label="Тикер"
                htmlFor={tickerId}
                {...(paramErrors.ticker !== undefined ? { error: paramErrors.ticker } : {})}
              >
                <Input
                  id={tickerId}
                  value={params.ticker}
                  placeholder="SBER"
                  invalid={paramErrors.ticker !== undefined}
                  onChange={(event) =>
                    setParams((prev) => ({ ...prev, ticker: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Timeframe" htmlFor={timeframeId}>
                <select
                  id={timeframeId}
                  className="ui-input"
                  value={params.timeframe}
                  onChange={(event) => {
                    const value = event.target.value;
                    for (const option of TIMEFRAME_OPTIONS) {
                      if (option === value) {
                        setParams((prev) => ({ ...prev, timeframe: option }));
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
              <FormField
                label="С"
                htmlFor={fromId}
                {...(paramErrors.range !== undefined ? { error: paramErrors.range } : {})}
              >
                <Input
                  id={fromId}
                  type="date"
                  value={params.fromDate}
                  invalid={paramErrors.range !== undefined}
                  onChange={(event) =>
                    setParams((prev) => ({ ...prev, fromDate: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="По" htmlFor={toId}>
                <Input
                  id={toId}
                  type="date"
                  value={params.toDate}
                  invalid={paramErrors.range !== undefined}
                  onChange={(event) =>
                    setParams((prev) => ({ ...prev, toDate: event.target.value }))
                  }
                />
              </FormField>
              <FormField
                label="Initial cash"
                htmlFor={cashId}
                hint="Опционально; значение не отображается как реальный баланс"
              >
                <Input
                  id={cashId}
                  inputMode="decimal"
                  value={params.initialCash}
                  placeholder="—"
                  onChange={(event) =>
                    setParams((prev) => ({ ...prev, initialCash: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="backtesting-page__actions">
              <Button type="submit" size="sm">
                Проверить параметры
              </Button>
              <Button href="/app/strategies" variant="ghost" size="sm">
                Выбрать стратегию
              </Button>
            </div>
            {submitMessage !== null ? (
              <p className="backtesting-page__note" role="status">
                {submitMessage}
              </p>
            ) : null}
          </form>
        </CardBody>
      </Card>

      <div className="backtesting-page__layout">
        <Card>
          <CardHeader
            title="Прогоны"
            action={
              <Badge tone="neutral">
                {visible.length === 0 ? 'EMPTY' : String(visible.length)}
              </Badge>
            }
          />
          <CardBody>
            <div className="backtesting-page__filters">
              <FormField label="Стратегия" htmlFor={strategyFilterId}>
                <Input
                  id={strategyFilterId}
                  value={filters.strategyQuery}
                  placeholder="Breakout"
                  onChange={(event) => updateFilter('strategyQuery', event.target.value)}
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
                  <option value="queued">QUEUED</option>
                  <option value="running">RUNNING</option>
                  <option value="succeeded">SUCCEEDED</option>
                  <option value="failed">FAILED</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </FormField>
            </div>

            {visible.length === 0 ? (
              <EmptyState
                title="Нет прогонов backtest"
                description="История запусков появится после worker-backtest. Сравнение и метрики остаются пустыми — без DEMO DATA."
                action={<Button href="/app/strategies">Открыть стратегии</Button>}
              />
            ) : (
              <ul className="backtesting-page__list">
                {visible.map((item) => (
                  <RunListRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    compared={compareIds.includes(item.id)}
                    onSelect={setSelectedId}
                    onToggleCompare={(id) =>
                      setCompareIds((prev) => compareRunIdsForSelection(prev, id, COMPARE_LIMIT))
                    }
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Результат" action={<Badge tone="info">NO FAKE PnL</Badge>} />
          <CardBody>
            <RunDetailPanel item={selected} compareCount={compareIds.length} />
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
