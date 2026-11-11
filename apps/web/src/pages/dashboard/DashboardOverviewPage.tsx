import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { MarketStatusBadge } from '../../shared/ui/MarketStatusBadge.js';
import './dashboard-overview.css';

export function DashboardOverviewPage() {
  return (
    <section className="dash-overview" aria-labelledby="dash-overview-title">
      <div className="dash-overview__intro">
        <h2 id="dash-overview-title" className="visually-hidden">
          Market overview
        </h2>
        <p>
          Shared UI primitives power this empty overview. Connect market data before any quotes or
          portfolio figures appear.
        </p>
      </div>

      <div className="dash-overview__grid">
        <Card className="dash-panel--span-8">
          <CardHeader title="Рыночный снимок" action={<MarketStatusBadge status="offline" />} />
          <CardBody>
            <EmptyState
              title="Нет подключения к рыночным данным"
              description="Подключите источник и выберите инструменты наблюдения. Пустые графики без фиктивных кривых."
              action={<Button href="/app/settings">Подключить источник</Button>}
              secondaryAction={
                <Button href="/app/market" variant="ghost">
                  Открыть рынок
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
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-4">
          <CardHeader title="Мои стратегии" />
          <CardBody>
            <EmptyState
              title="Стратегии ещё не созданы"
              description="Создайте первую стратегию или откройте пример на следующем этапе."
              action={
                <Button href="/app/strategies" variant="secondary" size="sm">
                  К стратегиям
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="dash-panel--span-4">
          <CardHeader title="Состояние системы" />
          <CardBody>
            <ul className="dash-panel__status">
              <li>
                <MarketStatusBadge status="offline" />
                <span>Market data</span>
              </li>
              <li>
                <MarketStatusBadge status="offline" />
                <span>Stream subscription</span>
              </li>
              <li>
                <Badge tone="brand">READY</Badge>
                <span>App shell / primitives</span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
