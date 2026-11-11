import { type FormEvent, useId, useState } from 'react';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { FormField, Input } from '../../shared/ui/Input.js';
import {
  buildLiveConfirmDescription,
  createEmptyOrderDraft,
  type OrderDraft,
  type OrderListItem,
  orderLifecycleLabel,
  orderSideLabel,
  orderSideTone,
  type TradingExecutionMode,
  tradingModeLabel,
  tradingModeTone,
  validateOrderDraft,
} from './trading-types.js';
import './trading-page.css';

type Props = {
  orders?: readonly OrderListItem[];
  initialMode?: TradingExecutionMode;
};

const MODE_OPTIONS: TradingExecutionMode[] = ['sandbox', 'paper', 'live'];
const SIDE_OPTIONS: Array<OrderDraft['side']> = ['buy', 'sell'];
const TYPE_OPTIONS: Array<OrderDraft['orderType']> = ['limit', 'market'];

export function TradingPage(props: Props) {
  const orders = props.orders ?? [];
  const [mode, setMode] = useState<TradingExecutionMode>(props.initialMode ?? 'sandbox');
  const [draft, setDraft] = useState<OrderDraft>(() => createEmptyOrderDraft());
  const [errors, setErrors] = useState<{
    ticker?: string;
    quantity?: string;
    price?: string;
  }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);

  const modeId = useId();
  const tickerId = useId();
  const sideId = useId();
  const typeId = useId();
  const qtyId = useId();
  const priceId = useId();

  function submitValidatedDraft() {
    setMessage(
      `Черновик заявки проверен для режима ${tradingModeLabel(mode)}. Отправка в execution API появится позже — список заявок не заполняется выдуманными ордерами.`,
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateOrderDraft(draft);
    const nextErrors: { ticker?: string; quantity?: string; price?: string } = {};
    if (validation.tickerError !== undefined) {
      nextErrors.ticker = validation.tickerError;
    }
    if (validation.quantityError !== undefined) {
      nextErrors.quantity = validation.quantityError;
    }
    if (validation.priceError !== undefined) {
      nextErrors.price = validation.priceError;
    }
    setErrors(nextErrors);
    if (!validation.ok) {
      setMessage(null);
      return;
    }
    if (mode === 'live') {
      setLiveConfirmOpen(true);
      return;
    }
    submitValidatedDraft();
  }

  return (
    <section className="trading-page" aria-labelledby="trading-page-title">
      <div className="trading-page__toolbar">
        <div>
          <h2 id="trading-page-title" className="trading-page__heading">
            Торговля
          </h2>
          <p className="trading-page__lede">
            Заявки и исполнения. Режимы SANDBOX / PAPER / LIVE различимы текстом и бейджем. LIVE —
            только с подтверждением.
          </p>
        </div>
        <div className="trading-page__actions">
          <Badge tone={tradingModeTone(mode)}>{tradingModeLabel(mode)}</Badge>
          <Button href="/app/portfolio" variant="secondary" size="sm">
            Портфель
          </Button>
        </div>
      </div>

      <div className="trading-page__modes">
        <Card>
          <CardHeader title="SANDBOX" action={<Badge tone="info">TEST</Badge>} />
          <CardBody>
            <p className="trading-page__mode-copy">
              Тестовое окружение брокера. Не реальные деньги.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="PAPER" action={<Badge tone="neutral">SIM</Badge>} />
          <CardBody>
            <p className="trading-page__mode-copy">Внутренний симулятор исполнения.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="LIVE" action={<Badge tone="warning">REAL</Badge>} />
          <CardBody>
            <p className="trading-page__mode-copy">
              Реальные операции. Требует ConfirmDialog и осознание риска.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="trading-page__layout">
        <Card>
          <CardHeader
            title="Новая заявка"
            action={<Badge tone={tradingModeTone(mode)}>{tradingModeLabel(mode)}</Badge>}
          />
          <CardBody>
            <form className="trading-page__form" onSubmit={onSubmit} noValidate>
              <FormField label="Режим исполнения" htmlFor={modeId}>
                <select
                  id={modeId}
                  className="ui-input"
                  value={mode}
                  onChange={(event) => {
                    const value = event.target.value;
                    for (const option of MODE_OPTIONS) {
                      if (option === value) {
                        setMode(option);
                        setMessage(null);
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
              </FormField>
              <div className="trading-page__form-grid">
                <FormField
                  label="Тикер"
                  htmlFor={tickerId}
                  {...(errors.ticker !== undefined ? { error: errors.ticker } : {})}
                >
                  <Input
                    id={tickerId}
                    value={draft.ticker}
                    placeholder="SBER"
                    invalid={errors.ticker !== undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, ticker: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Сторона" htmlFor={sideId}>
                  <select
                    id={sideId}
                    className="ui-input"
                    value={draft.side}
                    onChange={(event) => {
                      const value = event.target.value;
                      for (const option of SIDE_OPTIONS) {
                        if (option === value) {
                          setDraft((prev) => ({ ...prev, side: option }));
                          return;
                        }
                      }
                    }}
                  >
                    <option value="buy">BUY</option>
                    <option value="sell">SELL</option>
                  </select>
                </FormField>
                <FormField label="Тип" htmlFor={typeId}>
                  <select
                    id={typeId}
                    className="ui-input"
                    value={draft.orderType}
                    onChange={(event) => {
                      const value = event.target.value;
                      for (const option of TYPE_OPTIONS) {
                        if (option === value) {
                          setDraft((prev) => ({ ...prev, orderType: option }));
                          return;
                        }
                      }
                    }}
                  >
                    <option value="limit">LIMIT</option>
                    <option value="market">MARKET</option>
                  </select>
                </FormField>
                <FormField
                  label="Количество"
                  htmlFor={qtyId}
                  {...(errors.quantity !== undefined ? { error: errors.quantity } : {})}
                >
                  <Input
                    id={qtyId}
                    inputMode="decimal"
                    value={draft.quantity}
                    placeholder="10"
                    invalid={errors.quantity !== undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                  />
                </FormField>
                <FormField
                  label="Цена LIMIT"
                  htmlFor={priceId}
                  {...(errors.price !== undefined ? { error: errors.price } : {})}
                >
                  <Input
                    id={priceId}
                    inputMode="decimal"
                    value={draft.limitPrice}
                    placeholder="—"
                    disabled={draft.orderType === 'market'}
                    invalid={errors.price !== undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, limitPrice: event.target.value }))
                    }
                  />
                </FormField>
              </div>
              <div className="trading-page__actions">
                <Button type="submit" size="sm" variant={mode === 'live' ? 'danger' : 'primary'}>
                  {mode === 'live' ? 'Подтвердить LIVE…' : 'Проверить заявку'}
                </Button>
                <Button href="/app/signals" variant="ghost" size="sm">
                  К сигналам
                </Button>
              </div>
              {message !== null ? (
                <p className="trading-page__note" role="status">
                  {message}
                </p>
              ) : null}
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Заявки и исполнения"
            action={
              <Badge tone="neutral">{orders.length === 0 ? 'EMPTY' : String(orders.length)}</Badge>
            }
          />
          <CardBody>
            {orders.length === 0 ? (
              <EmptyState
                title="Заявок пока нет"
                description="Список ордеров и fills появится после execution API. Сигнал ≠ заявка; DEMO DATA не подмешивается."
                action={<Button href="/app/portfolio">Открыть портфель</Button>}
              />
            ) : (
              <ul className="trading-page__orders">
                {orders.map((order) => (
                  <li key={order.id} className="trading-page__order">
                    <div className="trading-page__row">
                      <p className="trading-page__name">
                        {order.ticker} · {orderSideLabel(order.side)}
                      </p>
                      <div className="trading-page__row">
                        <Badge tone={orderSideTone(order.side)}>{orderSideLabel(order.side)}</Badge>
                        <Badge tone={tradingModeTone(order.mode)}>
                          {tradingModeLabel(order.mode)}
                        </Badge>
                        <Badge>{orderLifecycleLabel(order.lifecycle)}</Badge>
                      </div>
                    </div>
                    <p className="trading-page__note">
                      {order.orderType.toUpperCase()} · qty {order.quantity}
                      {order.limitPrice !== null ? ` · ${order.limitPrice}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={liveConfirmOpen}
        title="Подтверждение LIVE-заявки"
        description={buildLiveConfirmDescription(draft, 'live')}
        confirmLabel="Отправить LIVE"
        cancelLabel="Отмена"
        danger
        onCancel={() => setLiveConfirmOpen(false)}
        onConfirm={() => {
          setLiveConfirmOpen(false);
          submitValidatedDraft();
        }}
      />
    </section>
  );
}
