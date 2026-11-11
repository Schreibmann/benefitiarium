import { useState } from 'react';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import {
  emptyPortfolioSummary,
  type PortfolioSummarySlots,
  type PositionListItem,
  type TradingExecutionMode,
  tradingModeLabel,
  tradingModeTone,
} from './trading-types.js';
import './trading-page.css';

type Props = {
  positions?: readonly PositionListItem[];
  summary?: PortfolioSummarySlots;
  initialMode?: TradingExecutionMode;
};

const MODE_OPTIONS: TradingExecutionMode[] = ['sandbox', 'paper', 'live'];

export function PortfolioPage(props: Props) {
  const positions = props.positions ?? [];
  const summary = props.summary ?? emptyPortfolioSummary();
  const [mode, setMode] = useState<TradingExecutionMode>(props.initialMode ?? 'sandbox');

  return (
    <section className="portfolio-page" aria-labelledby="portfolio-page-title">
      <div className="portfolio-page__toolbar">
        <div>
          <h2 id="portfolio-page-title" className="portfolio-page__heading">
            Портфель
          </h2>
          <p className="portfolio-page__lede">
            Позиции и сводка счёта. Стоимость и PnL не выдумываются — Empty State до подключения
            счёта. Режим {tradingModeLabel(mode)} виден явно.
          </p>
        </div>
        <div className="portfolio-page__actions">
          <Badge tone={tradingModeTone(mode)}>{tradingModeLabel(mode)}</Badge>
          <label className="portfolio-page__note" htmlFor="portfolio-mode">
            Режим
            <select
              id="portfolio-mode"
              className="ui-input"
              value={mode}
              onChange={(event) => {
                const value = event.target.value;
                for (const option of MODE_OPTIONS) {
                  if (option === value) {
                    setMode(option);
                    return;
                  }
                }
              }}
            >
              {MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {tradingModeLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <Button href="/app/trading" size="sm">
            К торговле
          </Button>
        </div>
      </div>

      <div className="portfolio-page__summary">
        <Card>
          <CardHeader title="Equity" action={<Badge tone="neutral">EMPTY</Badge>} />
          <CardBody>
            <p className="portfolio-page__summary-value">
              {summary.equityAvailable
                ? 'Ожидает API'
                : 'Нет данных — подключите Sandbox или брокерский счёт'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Cash" action={<Badge tone="neutral">EMPTY</Badge>} />
          <CardBody>
            <p className="portfolio-page__summary-value">
              {summary.cashAvailable
                ? 'Ожидает API'
                : 'Доступные средства появятся после sync счёта'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="PnL" action={<Badge tone="neutral">EMPTY</Badge>} />
          <CardBody>
            <p className="portfolio-page__summary-value">
              {summary.pnlAvailable
                ? 'Ожидает API'
                : 'PnL не показывается без реальных позиций и котировок'}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="portfolio-page__layout">
        <Card>
          <CardHeader
            title="Позиции"
            action={
              <Badge tone="neutral">
                {positions.length === 0 ? 'EMPTY' : String(positions.length)}
              </Badge>
            }
          />
          <CardBody>
            {positions.length === 0 ? (
              <EmptyState
                title="Подключите Sandbox или брокерский счёт"
                description="Позиции появятся после синхронизации. Режим счёта должен совпадать с Trading (SANDBOX / PAPER / LIVE)."
                action={<Button href="/admin/sandbox">Sandbox Admin</Button>}
                secondaryAction={
                  <Button href="/app/trading" variant="ghost">
                    Открыть торговлю
                  </Button>
                }
              />
            ) : (
              <ul className="portfolio-page__positions">
                {positions.map((position) => (
                  <li key={position.id} className="portfolio-page__position">
                    <div className="portfolio-page__row">
                      <p className="portfolio-page__name">{position.ticker}</p>
                      <Badge tone={tradingModeTone(position.mode)}>
                        {tradingModeLabel(position.mode)}
                      </Badge>
                    </div>
                    <p className="portfolio-page__note">
                      qty {position.quantity} · avg {position.avgPrice}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Связь с Trading"
            action={<Badge tone="warning">ORDER ≠ SIGNAL</Badge>}
          />
          <CardBody>
            <p className="portfolio-page__note">
              Портфель отражает результат исполненных заявок. Аналитические сигналы сами по себе не
              меняют позиции. LIVE-действия требуют подтверждения на странице Trading.
            </p>
            <div className="portfolio-page__actions">
              <Button href="/app/trading" size="sm">
                Новая заявка
              </Button>
              <Button href="/app/signals" variant="ghost" size="sm">
                К сигналам
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
