import { useEffect, useState } from 'react';
import { ThemeSwitch } from '../../features/theme-switch/ThemeSwitch.js';
import { SkipLink } from '../../shared/a11y/SkipLink.js';
import { Badge } from '../../shared/ui/Badge.js';
import { BrandMark } from '../../shared/ui/BrandMark.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import './landing.css';

type LandingNavItem = {
  href: string;
  label: string;
};

const NAV: readonly LandingNavItem[] = [
  { href: '#capabilities', label: 'Возможности' },
  { href: '#markets', label: 'Рынки' },
  { href: '#how-it-works', label: 'Как это работает' },
  { href: '#docs', label: 'Документация' },
];

function StripIcon({ path }: { path: string }) {
  return (
    <span className="landing__strip-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path fill="currentColor" d={path} />
      </svg>
    </span>
  );
}

export function LandingPage() {
  const [solidHeader, setSolidHeader] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setSolidHeader(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const headerClass =
    solidHeader === true ? 'landing__header landing__header--solid' : 'landing__header';
  const mobileNavClass =
    mobileOpen === true ? 'landing__mobile-nav landing__mobile-nav--open' : 'landing__mobile-nav';

  return (
    <div className="landing">
      <SkipLink targetId="landing-main" />
      <header className={headerClass}>
        <div className="landing__header-inner">
          <BrandMark />
          <nav className="landing__nav" aria-label="Landing">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="landing__header-actions">
            <ThemeSwitch />
            <Button href="/app" variant="ghost" size="sm">
              Войти
            </Button>
            <Button href="/app" size="sm">
              Открыть платформу
            </Button>
            <button
              type="button"
              className="landing__menu-btn"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="landing-mobile-nav"
              onClick={() => {
                setMobileOpen((value) => !value);
              }}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
        <div className={mobileNavClass} id="landing-mobile-nav">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => {
                setMobileOpen(false);
              }}
            >
              {item.label}
            </a>
          ))}
          <Button href="/app" block>
            Открыть платформу
          </Button>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="landing__hero" aria-labelledby="landing-hero-title">
          <div className="landing__hero-inner">
            <div className="landing__hero-copy">
              <p className="landing__eyebrow">BENEFITIARIUM</p>
              <h1 id="landing-hero-title">Рынок. Данные. Решения.</h1>
              <p className="landing__lede">
                Аналитическая и торговая среда для работы с инструментами Московской биржи — от
                исторических данных и стратегий до торговых сигналов и исполнения сделок.
              </p>
              <div className="landing__hero-actions">
                <Button href="/app">Открыть платформу</Button>
                <Button href="#capabilities" variant="ghost">
                  Изучить возможности
                </Button>
              </div>
            </div>
            <div className="landing__hero-art" aria-hidden="true">
              <div className="landing__hero-badge">
                <Badge tone="brand">MOEX</Badge>
              </div>
              <div className="landing__hero-chart">
                <div className="landing__hero-candles">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="landing__hero-line" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing__strip" aria-label="Capability strip">
          <article className="landing__strip-item">
            <StripIcon path="M4 18h2V9H4v9zm5 0h2V5H9v13zm5 0h2v-7h-2v7zm5 0h2V3h-2v15z" />
            <h3>Рыночные данные</h3>
            <p>История и realtime-потоки через backend, без прямого доступа браузера к брокеру.</p>
          </article>
          <article className="landing__strip-item">
            <StripIcon path="M3.5 18.5 9 13l3.5 3.5L20.5 8l-1.4-1.4-6.6 6.6L9 10 2.1 17.1l1.4 1.4z" />
            <h3>Техническая аналитика</h3>
            <p>Графики, индикаторы и уровни для самостоятельного анализа рынка.</p>
          </article>
          <article className="landing__strip-item">
            <StripIcon path="M12 3 4 19h16L12 3zm0 4.5 5.2 10H6.8L12 7.5z" />
            <h3>Стратегии и сигналы</h3>
            <p>Исследование условий, backtesting и наблюдение за сигналами отдельно от заявок.</p>
          </article>
          <article className="landing__strip-item">
            <StripIcon path="M4 4h16v4H4V4zm0 6h7v10H4V10zm9 0h7v10h-7V10z" />
            <h3>Исполнение с контролем</h3>
            <p>Sandbox, Paper и Live различимы; риск-ограничения задаются до автоматизации.</p>
          </article>
        </section>

        <section
          id="capabilities"
          className="landing__section"
          aria-labelledby="capabilities-title"
        >
          <div className="landing__section-head">
            <h2 id="capabilities-title">Единая рабочая среда</h2>
            <p>
              От обзора рынка до исполнения — в одном интерфейсе, без обещаний доходности и без
              подмены пустых состояний демо-котировками.
            </p>
          </div>
          <div className="landing__cards">
            <Card>
              <CardHeader title="Аналитика рынка" />
              <CardBody>
                <p className="landing__card-kicker">Charts · Indicators · History</p>
                <p>Графики, индикаторы, уровни и история по выбранному инструменту.</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Стратегии и сигналы" />
              <CardBody>
                <p className="landing__card-kicker">Rules · Signals · Monitoring</p>
                <p>Настройка условий и наблюдение за сигналами без смешения с ордерами.</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Исследование" />
              <CardBody>
                <p className="landing__card-kicker">Backtesting · Metrics</p>
                <p>Исторические прогоны, метрики и сравнение сценариев на проверяемых данных.</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Исполнение" />
              <CardBody>
                <p className="landing__card-kicker">Orders · Portfolio · Sandbox</p>
                <p>Заявки, портфель, Sandbox и контроль рисков с явным режимом счёта.</p>
              </CardBody>
            </Card>
          </div>
        </section>

        <section id="markets" className="landing__section" aria-labelledby="markets-title">
          <div className="landing__section-head">
            <h2 id="markets-title">Рынки</h2>
            <p>
              Фокус на Московской бирже: акции, валюты, индексы, товарные и индексные фьючерсы.
              Конкретные инструменты появляются после подключения источника данных.
            </p>
          </div>
          <Card>
            <CardBody>
              <EmptyMarketsNote />
            </CardBody>
          </Card>
        </section>

        <section id="how-it-works" className="landing__section" aria-labelledby="how-title">
          <div className="landing__section-head">
            <h2 id="how-title">Как это работает</h2>
            <p>Три шага от данных к решению. Автоисполнение — отдельный режим.</p>
          </div>
          <div className="landing__steps">
            <article className="landing__step">
              <span className="landing__step-num">01</span>
              <h3>Подключите данные</h3>
              <p>Выберите источник рыночных данных и инструменты для наблюдения.</p>
            </article>
            <article className="landing__step">
              <span className="landing__step-num">02</span>
              <h3>Анализируйте и тестируйте</h3>
              <p>Изучайте историю, индикаторы и результаты backtesting до любого live-риска.</p>
            </article>
            <article className="landing__step">
              <span className="landing__step-num">03</span>
              <h3>Принимайте решения</h3>
              <p>
                Используйте сигналы вручную или включите автоматизацию только после лимитов риска.
              </p>
            </article>
          </div>
          <p className="landing__note">
            Автоматическое исполнение включается отдельно и не является режимом по умолчанию.
          </p>
        </section>

        <section className="landing__section" aria-labelledby="trust-title">
          <div className="landing__section-head">
            <h2 id="trust-title">Прозрачность и контроль</h2>
            <p>Интерфейс показывает состояние данных и режимов, а не иллюзию активности.</p>
          </div>
          <ul className="landing__trust">
            <li>
              <span className="landing__trust-mark" aria-hidden="true" />
              Источники рыночных данных обозначаются явно.
            </li>
            <li>
              <span className="landing__trust-mark" aria-hidden="true" />
              Задержка и свежесть данных видны пользователю (LIVE / STALE / OFFLINE).
            </li>
            <li>
              <span className="landing__trust-mark" aria-hidden="true" />
              Результаты backtesting отделены от реальной доходности.
            </li>
            <li>
              <span className="landing__trust-mark" aria-hidden="true" />
              Sandbox визуально отделён от боевого счёта.
            </li>
            <li>
              <span className="landing__trust-mark" aria-hidden="true" />
              Торговые операции журналируются на стороне backend.
            </li>
          </ul>
        </section>

        <section className="landing__section landing__cta" aria-labelledby="final-cta-title">
          <h2 id="final-cta-title">Соберите собственную систему анализа и торговли</h2>
          <p>
            Начните с App Shell и пустых состояний — котировки и портфель появятся только после
            реальных подключений.
          </p>
          <Button href="/app">Открыть платформу</Button>
        </section>
      </main>

      <footer className="landing__footer" id="docs">
        <div className="landing__footer-inner">
          <div className="landing__footer-brand">
            <BrandMark />
            <p>
              BENEFITIARIUM — Market Intelligence & Trading Platform для работы с рынком MOEX. Не
              является инвестиционной рекомендацией.
            </p>
          </div>
          <div>
            <h3>Возможности</h3>
            <ul>
              <li>
                <a href="#capabilities">Рабочая среда</a>
              </li>
              <li>
                <a href="#how-it-works">Как это работает</a>
              </li>
              <li>
                <a href="/app">Обзор платформы</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Документация</h3>
            <ul>
              <li>
                <a href="/admin/sandbox">Sandbox Admin</a>
              </li>
              <li>
                <span>Публичные docs — по мере публикации</span>
              </li>
              <li>
                <span>Поддержка — каналы появятся позже</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="landing__footer-bottom">
          <span>© {new Date().getFullYear()} BENEFITIARIUM</span>
          <span>
            Риск-дисклеймер: торговля финансовыми инструментами связана с риском потери капитала.
            Платформа не обещает доходность и не гарантирует точность сигналов.
          </span>
        </div>
      </footer>
    </div>
  );
}

function EmptyMarketsNote() {
  return (
    <p>
      Каталог инструментов и покрытие истории подключаются через backend. До этого Landing не
      показывает выдуманные тикеры, цены или объёмы.
    </p>
  );
}
