import { type KeyboardEvent as ReactKeyboardEvent, useId, useState } from 'react';
import { nextTabIndex, tabKeyDirection } from '../../shared/a11y/tab-keyboard.js';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { FormField, Input } from '../../shared/ui/Input.js';
import {
  createDefaultSignalFilters,
  filterSignalsForTab,
  type SignalFilters,
  type SignalListItem,
  type SignalsListTab,
  signalDirectionLabel,
  signalDirectionTone,
  signalLifecycleLabel,
  signalLifecycleTone,
} from './signal-types.js';
import './signals-page.css';

const SIGNAL_TABS: SignalsListTab[] = ['active', 'history'];

type Props = {
  items?: readonly SignalListItem[];
};

const TIMEFRAME_OPTIONS: Array<SignalFilters['timeframe']> = ['all', '1m', '5m', '15m', '1h', '1d'];
const DIRECTION_OPTIONS: Array<SignalFilters['direction']> = ['all', 'buy', 'sell', 'neutral'];
const LIFECYCLE_OPTIONS: Array<SignalFilters['lifecycle']> = [
  'all',
  'active',
  'expired',
  'cancelled',
  'converted',
];

function formatSignalTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function SignalListRow(props: {
  item: SignalListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const className = props.selected
    ? 'signals-page__list-item signals-page__list-item--active'
    : 'signals-page__list-item';

  return (
    <li>
      <button
        type="button"
        className={className}
        aria-pressed={props.selected}
        onClick={() => props.onSelect(props.item.id)}
      >
        <div className="signals-page__list-row">
          <p className="signals-page__ticker">
            {props.item.ticker}
            <span className="signals-page__meta"> · {props.item.instrumentName}</span>
          </p>
          <div className="signals-page__list-row">
            <Badge tone={signalDirectionTone(props.item.direction)}>
              {signalDirectionLabel(props.item.direction)}
            </Badge>
            <Badge tone={signalLifecycleTone(props.item.lifecycle)}>
              {signalLifecycleLabel(props.item.lifecycle)}
            </Badge>
          </div>
        </div>
        <p className="signals-page__meta">
          {props.item.timeframe} · {props.item.strategyName} ·{' '}
          {formatSignalTime(props.item.createdAtIso)}
        </p>
        <p className="signals-page__meta">{props.item.reason}</p>
      </button>
    </li>
  );
}

function SignalDetailPanel(props: { item: SignalListItem | null }) {
  if (props.item === null) {
    return (
      <EmptyState
        title="Выберите сигнал"
        description="Детали причины, стратегии и жизненного цикла появятся здесь. Сигнал — аналитический результат, не заявка."
      />
    );
  }

  const item = props.item;

  return (
    <div className="signals-page__detail-grid">
      <div className="signals-page__list-row">
        <Badge tone="info">SIGNAL</Badge>
        <Badge tone={signalDirectionTone(item.direction)}>
          {signalDirectionLabel(item.direction)}
        </Badge>
        <Badge tone={signalLifecycleTone(item.lifecycle)}>
          {signalLifecycleLabel(item.lifecycle)}
        </Badge>
      </div>
      <dl>
        <div className="signals-page__detail-row">
          <dt>Тикер</dt>
          <dd>
            {item.ticker} · {item.instrumentName}
          </dd>
        </div>
        <div className="signals-page__detail-row">
          <dt>Timeframe</dt>
          <dd>{item.timeframe}</dd>
        </div>
        <div className="signals-page__detail-row">
          <dt>Стратегия</dt>
          <dd>{item.strategyName}</dd>
        </div>
        <div className="signals-page__detail-row">
          <dt>Причина</dt>
          <dd>{item.reason}</dd>
        </div>
        <div className="signals-page__detail-row">
          <dt>Создан</dt>
          <dd>{formatSignalTime(item.createdAtIso)} · Europe/Moscow</dd>
        </div>
      </dl>
      <p className="signals-page__note">
        Сигнал не является заявкой. Исполнение — отдельное действие в Trading / Portfolio после
        подтверждения.
      </p>
      <Button href="/app/trading" variant="secondary" size="sm">
        Открыть Trading
      </Button>
    </div>
  );
}

export function SignalsPage(props: Props) {
  const items = props.items ?? [];
  const [filters, setFilters] = useState<SignalFilters>(() => createDefaultSignalFilters());
  const [tab, setTab] = useState<SignalsListTab>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tickerId = useId();
  const strategyId = useId();
  const directionId = useId();
  const timeframeId = useId();
  const lifecycleId = useId();

  const visible = filterSignalsForTab(items, filters, tab);
  const selected =
    selectedId === null ? null : (visible.find((item) => item.id === selectedId) ?? null);

  function updateFilter<K extends keyof SignalFilters>(key: K, value: SignalFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedId(null);
  }

  const listTitle = tab === 'active' ? 'Активные сигналы' : 'История сигналов';
  const emptyTitle =
    tab === 'active' ? 'Сигналы появятся после настройки стратегии' : 'История сигналов пуста';
  const emptyDescription =
    tab === 'active'
      ? 'Активные сигналы появятся здесь после подключения данных и запуска стратегии в режиме MONITORING. Это не заявки.'
      : 'Истёкшие, отменённые и конвертированные сигналы появятся после работы стратегий. DEMO DATA не подмешивается.';

  return (
    <section className="signals-page" aria-labelledby="signals-page-title">
      <div className="signals-page__toolbar">
        <div>
          <h2 id="signals-page-title" className="signals-page__heading">
            Сигналы
          </h2>
          <p className="signals-page__lede">
            Список и история аналитических сигналов: тикер, timeframe, стратегия, направление и
            причина. Сигнал ≠ заявка.
          </p>
        </div>
        <Button href="/app/strategies" size="sm">
          Настроить стратегию
        </Button>
      </div>

      <div className="signals-page__distinction">
        <Card>
          <CardHeader title="SIGNAL" action={<Badge tone="info">ANALYSIS</Badge>} />
          <CardBody>
            <p className="signals-page__distinction-card">
              Результат стратегии: условие сработало. Можно изучить причину, но ордер не создаётся
              автоматически.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="ORDER" action={<Badge tone="warning">EXECUTION</Badge>} />
          <CardBody>
            <p className="signals-page__distinction-card">
              Торговое действие в Sandbox / Paper / Live. Управление заявками — в разделе Trading /
              Portfolio.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Фильтры" />
        <CardBody>
          <div className="signals-page__filters">
            <FormField label="Тикер" htmlFor={tickerId}>
              <Input
                id={tickerId}
                value={filters.tickerQuery}
                placeholder="SBER"
                onChange={(event) => updateFilter('tickerQuery', event.target.value)}
              />
            </FormField>
            <FormField label="Стратегия" htmlFor={strategyId}>
              <Input
                id={strategyId}
                value={filters.strategyQuery}
                placeholder="Название"
                onChange={(event) => updateFilter('strategyQuery', event.target.value)}
              />
            </FormField>
            <FormField label="Направление" htmlFor={directionId}>
              <select
                id={directionId}
                className="ui-input"
                value={filters.direction}
                onChange={(event) => {
                  const value = event.target.value;
                  for (const option of DIRECTION_OPTIONS) {
                    if (option === value) {
                      updateFilter('direction', option);
                      return;
                    }
                  }
                }}
              >
                <option value="all">Все</option>
                <option value="buy">BUY</option>
                <option value="sell">SELL</option>
                <option value="neutral">NEUTRAL</option>
              </select>
            </FormField>
            <FormField label="Timeframe" htmlFor={timeframeId}>
              <select
                id={timeframeId}
                className="ui-input"
                value={filters.timeframe}
                onChange={(event) => {
                  const value = event.target.value;
                  for (const option of TIMEFRAME_OPTIONS) {
                    if (option === value) {
                      updateFilter('timeframe', option);
                      return;
                    }
                  }
                }}
              >
                <option value="all">Все</option>
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="1d">1d</option>
              </select>
            </FormField>
            <FormField label="Статус" htmlFor={lifecycleId}>
              <select
                id={lifecycleId}
                className="ui-input"
                value={filters.lifecycle}
                onChange={(event) => {
                  const value = event.target.value;
                  for (const option of LIFECYCLE_OPTIONS) {
                    if (option === value) {
                      updateFilter('lifecycle', option);
                      return;
                    }
                  }
                }}
              >
                <option value="all">Все</option>
                <option value="active">ACTIVE</option>
                <option value="expired">EXPIRED</option>
                <option value="cancelled">CANCELLED</option>
                <option value="converted">CONVERTED</option>
              </select>
            </FormField>
          </div>
        </CardBody>
      </Card>

      <div className="signals-page__layout">
        <Card>
          <CardHeader
            title={listTitle}
            action={
              <Badge tone="neutral">
                {visible.length === 0 ? 'EMPTY' : String(visible.length)}
              </Badge>
            }
          />
          <CardBody>
            <div
              className="signals-page__tabs"
              role="tablist"
              aria-label="Сигналы"
              onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                const direction = tabKeyDirection(event.key);
                if (direction === 'none') {
                  return;
                }
                event.preventDefault();
                const current = SIGNAL_TABS.indexOf(tab);
                const next = SIGNAL_TABS[nextTabIndex(current, SIGNAL_TABS.length, direction)];
                if (next === undefined) {
                  return;
                }
                setTab(next);
                setSelectedId(null);
                const target = event.currentTarget.querySelector<HTMLElement>(
                  `[data-signals-tab="${next}"]`,
                );
                target?.focus();
              }}
            >
              <button
                type="button"
                role="tab"
                id="signals-tab-active"
                data-signals-tab="active"
                aria-selected={tab === 'active'}
                aria-controls="signals-tabpanel"
                tabIndex={tab === 'active' ? 0 : -1}
                className={
                  tab === 'active'
                    ? 'signals-page__tab signals-page__tab--active'
                    : 'signals-page__tab'
                }
                onClick={() => {
                  setTab('active');
                  setSelectedId(null);
                }}
              >
                Активные
              </button>
              <button
                type="button"
                role="tab"
                id="signals-tab-history"
                data-signals-tab="history"
                aria-selected={tab === 'history'}
                aria-controls="signals-tabpanel"
                tabIndex={tab === 'history' ? 0 : -1}
                className={
                  tab === 'history'
                    ? 'signals-page__tab signals-page__tab--active'
                    : 'signals-page__tab'
                }
                onClick={() => {
                  setTab('history');
                  setSelectedId(null);
                }}
              >
                История
              </button>
            </div>

            <div
              role="tabpanel"
              id="signals-tabpanel"
              aria-labelledby={tab === 'active' ? 'signals-tab-active' : 'signals-tab-history'}
            >
              {visible.length === 0 ? (
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={<Button href="/app/strategies">Открыть стратегии</Button>}
                  secondaryAction={
                    <Button href="/app" variant="ghost">
                      К обзору
                    </Button>
                  }
                />
              ) : (
                <ul className="signals-page__list">
                  {visible.map((item) => (
                    <SignalListRow
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Детали сигнала" action={<Badge tone="info">SIGNAL ≠ ORDER</Badge>} />
          <CardBody>
            <SignalDetailPanel item={selected} />
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
