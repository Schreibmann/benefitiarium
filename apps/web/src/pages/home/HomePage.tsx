import { ThemeSwitch } from '../../features/theme-switch/ThemeSwitch.js';
import { BrandMark } from '../../shared/ui/BrandMark.js';
import './home-page.css';

export function HomePage() {
  return (
    <main className="home-page">
      <header className="home-page__bar">
        <BrandMark />
        <ThemeSwitch />
      </header>

      <section className="home-page__hero" aria-labelledby="home-hero-title">
        <p className="home-page__eyebrow">Market Intelligence & Trading Platform</p>
        <h1 id="home-hero-title">BENEFITIARIUM</h1>
        <p className="home-page__tagline">Аналитика. Стратегии. Возможности.</p>
        <p className="home-page__lede">
          Design tokens and theme switching are live. Landing sections and App Shell land in the
          next UI stages — without fabricated quotes or portfolio figures.
        </p>
        <div className="home-page__actions">
          <a className="home-page__btn home-page__btn--primary" href="/app">
            Открыть платформу
          </a>
          <a className="home-page__btn home-page__btn--ghost" href="/admin/sandbox">
            Sandbox Admin
          </a>
        </div>
      </section>

      <section id="status" className="home-page__status" aria-labelledby="home-status-title">
        <h2 id="home-status-title">Foundation status</h2>
        <ul className="home-page__status-list">
          <li>
            <span className="home-page__pill home-page__pill--ok">UI-002</span>
            Design tokens Dark/Light
          </li>
          <li>
            <span className="home-page__pill home-page__pill--ok">UI-003</span>
            App Shell sidebar / topbar
          </li>
          <li>
            <span className="home-page__pill">UI-005</span>
            Full Landing — later
          </li>
        </ul>
        <p className="home-page__note">
          Market widgets stay empty until real backend feeds are connected. No demo prices.
        </p>
      </section>
    </main>
  );
}
