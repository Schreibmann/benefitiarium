import { OnboardingChecklist } from '../../features/onboarding/OnboardingChecklist.js';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { MarketStatusBadge } from '../../shared/ui/MarketStatusBadge.js';
import './dashboard-overview.css';

function formatMoscowDate(now: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

export function DashboardOverviewPage() {
  const todayLabel = formatMoscowDate(new Date());

  return (
    <section className="dash-overview" aria-labelledby="dash-overview-title">
      <div className="dash-overview__toolbar">
        <div>
          <h2 id="dash-overview-title" className="dash-overview__heading">
            Обзор рынка
          </h2>
          <p className="dash-overview__date">{todayLabel} · Europe/Moscow</p>
        </div>
        <div className="dash-overview__toolbar-actions">
          <Button href="/app/market" variant="secondary" size="sm">
            Добавить инструмент
          </Button>
          <Button href="/app/settings" size="sm">
            Подключить источник
          </Button>
        </div>
      </div>

      <Card className="dash-welcome">
        <CardBody>
          <p className="dash-welcome__eyebrow">Добро пожаловать в BENEFITIARIUM</p>
          <p className="dash-welcome__text">
            Подключите данные, добавьте инструменты и настройте первую стратегию. Пока источники не
            подключены, виджеты показывают Empty State — без выдуманных котировок, PnL и сигналов.
          </p>
        </CardBody>
      </Card>

      <OnboardingChecklist />

      <div className="dash-overview__grid">
        <Card className="dash-panel--span-12">
          <CardHeader title="Рыночный снимок" action={<MarketStatusBadge status="offline" />} />
          <CardBody>
            <div className="dash-snapshot">
              <article className="dash-snapshot__slot">
                <p className="dash-snapshot__label">Слот 1</p>
                <p className="dash-snapshot__empty">Нет данных</p>
              </article>
              <article className="dash-snapshot__slot">
                <p className="dash-snapshot__label">Слот 2</p>
                <p className="dash-snapshot__empty">Нет данных</p>
              </article>
              <article className="dash-snapshot__slot">
                <p className="dash-snapshot__label">Слот 3</p>
                <p className="dash-snapshot__empty">Нет данных</p>
              </article>
            </div>
            <div className="dash-snapshot__cta">
              <EmptyState
                title="Нет подключения к рыночным данным"
                description="Стартовый набор индексов не закреплён. После подключения источника вы сможете выбрать инструменты для снимка."
                action={<Button href="/app/settings">Подключить источник</Button>}
                secondaryAction={
                  <Button href="/app/market" variant="ghost">
                    Открыть рынок
                  </Button>
                }
              />
            </div>
          </CardBody>
        </Card>

        <Card className="dash-panel--span-8">
          <CardHeader title="График" action={<Badge>EMPTY</Badge>} />
          <CardBody>
            <div className="dash-chart-empty" aria-hidden="true">
              <div className="dash-chart-empty__grid" />
            </div>
            <EmptyState
              title="Инструмент не выбран"
              description="Выберите инструмент, чтобы загрузить историю. Пустой график без фиктивных кривых."
              action={
                <Button href="/app/analytics" variant="secondary">
                  Открыть аналитику
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-4">
          <CardHeader title="Watchlist" />
          <CardBody>
            <EmptyState
              title="Список инструментов пуст"
              description="Добавьте тикеры в watchlist после подключения каталога."
              action={
                <Button href="/app/market" variant="secondary" size="sm">
                  Выбрать инструменты
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-4">
          <CardHeader title="Активные сигналы" />
          <CardBody>
            <EmptyState
              title="Нет активных сигналов"
              description="Сигналы появятся после настройки стратегии. Сигнал ≠ заявка."
              action={
                <Button href="/app/signals" variant="ghost" size="sm">
                  К сигналам
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-4">
          <CardHeader title="Мои стратегии" />
          <CardBody>
            <EmptyState
              title="Стратегии ещё не созданы"
              description="Режимы MONITORING / PAPER / SANDBOX / LIVE появятся вместе со статусами стратегий."
              action={
                <Button href="/app/strategies" variant="secondary" size="sm">
                  К стратегиям
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-4">
          <CardHeader title="Портфель" />
          <CardBody>
            <EmptyState
              title="Счёт не подключён"
              description="Подключите Sandbox или брокерский счёт. Стоимость, PnL и позиции не показываются без реального счёта."
              action={
                <Button href="/admin/sandbox" variant="secondary" size="sm">
                  Sandbox Admin
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-12">
          <CardHeader title="Состояние системы" />
          <CardBody>
            <ul className="dash-panel__status">
              <li>
                <MarketStatusBadge status="offline" />
                <span>Market data connection</span>
              </li>
              <li>
                <MarketStatusBadge status="offline" />
                <span>Stream freshness</span>
              </li>
              <li>
                <MarketStatusBadge status="offline" />
                <span>Broker connection</span>
              </li>
              <li>
                <Badge tone="warning">UNKNOWN</Badge>
                <span>Worker health — нет данных от backend</span>
              </li>
              <li>
                <Badge tone="brand">READY</Badge>
                <span>App shell / UI foundation</span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
