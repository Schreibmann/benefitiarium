import './dashboard-overview.css';

export function DashboardOverviewPage() {
  return (
    <section className="dash-overview" aria-labelledby="dash-overview-title">
      <div className="dash-overview__intro">
        <h2 id="dash-overview-title" className="visually-hidden">
          Market overview
        </h2>
        <p>
          App Shell is ready. Market cards, charts, signals and portfolio widgets stay empty until
          real backend feeds are connected — no fabricated quotes.
        </p>
      </div>

      <div className="dash-overview__grid">
        <article className="dash-panel dash-panel--span-8">
          <h3>Рыночный снимок</h3>
          <p className="dash-panel__empty">Нет подключения к рыночным данным</p>
          <a className="dash-panel__cta" href="/app/settings">
            Подключить источник
          </a>
        </article>

        <article className="dash-panel dash-panel--span-4">
          <h3>Watchlist</h3>
          <p className="dash-panel__empty">Список инструментов пока пуст</p>
        </article>

        <article className="dash-panel dash-panel--span-4">
          <h3>Активные сигналы</h3>
          <p className="dash-panel__empty">Нет активных сигналов</p>
        </article>

        <article className="dash-panel dash-panel--span-4">
          <h3>Мои стратегии</h3>
          <p className="dash-panel__empty">Стратегии ещё не созданы</p>
        </article>

        <article className="dash-panel dash-panel--span-4">
          <h3>Состояние системы</h3>
          <ul className="dash-panel__status">
            <li>
              <span className="dash-dot dash-dot--warn" /> Market data — offline
            </li>
            <li>
              <span className="dash-dot dash-dot--warn" /> Stream — not subscribed
            </li>
            <li>
              <span className="dash-dot dash-dot--ok" /> App shell — ready
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
