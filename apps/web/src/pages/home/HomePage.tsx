import { ThemeSwitch } from '../../features/theme-switch/ThemeSwitch.js';
import { Badge } from '../../shared/ui/Badge.js';
import { BrandMark } from '../../shared/ui/BrandMark.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
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
          Design tokens, App Shell and shared UI primitives are live. Full Landing sections land in
          UI-005 — without fabricated quotes or portfolio figures.
        </p>
        <div className="home-page__actions">
          <Button href="/app">Открыть платформу</Button>
          <Button href="/admin/sandbox" variant="ghost">
            Sandbox Admin
          </Button>
        </div>
      </section>

      <section id="status" className="home-page__status" aria-labelledby="home-status-title">
        <Card>
          <CardHeader title="Foundation status" titleId="home-status-title" />
          <CardBody>
            <ul className="home-page__status-list">
              <li>
                <Badge tone="brand">UI-002</Badge>
                Design tokens Dark/Light
              </li>
              <li>
                <Badge tone="brand">UI-003</Badge>
                App Shell sidebar / topbar
              </li>
              <li>
                <Badge tone="brand">UI-004</Badge>
                Shared UI primitives
              </li>
              <li>
                <Badge>UI-005</Badge>
                Full Landing — next
              </li>
            </ul>
            <p className="home-page__note">
              Market widgets stay empty until real backend feeds are connected. No demo prices.
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
