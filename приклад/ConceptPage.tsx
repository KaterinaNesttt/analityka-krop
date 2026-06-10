import { AppLayout } from '@/components/layout/AppLayout';
import { Page } from '@/components/ui/page';
import './ConceptPage.css';

const marketRows = [
  { asset: 'Bitcoin', pair: 'BTC / USD', value: '$64,302.81', change: '+2.4%', tone: 'btc' },
  { asset: 'Ethereum', pair: 'ETH / USD', value: '$3,452.19', change: '-0.8%', tone: 'eth' },
  { asset: 'Solana', pair: 'SOL / USD', value: '$142.66', change: '+11.2%', tone: 'sol' },
];

const flowBars = [46, 68, 60, 86, 72, 42];

export function ConceptPage() {
  return (
    <AppLayout>
      <Page className="min-h-screen space-y-4 sm:space-y-6 sm:p-4 md:p-8 mt-0">
        <section className="concept-stage mt-0" aria-label="Концепт">
          <main className="concept-content">
            <section className="concept-hero-card">
              <div className="concept-hero-copy">
                <p>Портфоліо теми</p>
                <h1>
                  Нова
                  <span>Атмосфера</span>
                </h1>
                <strong>
                  Високоточне управління активами, відтворене в редакційних шарах. Спостерігайте за
                  ринковими коливаннями на фізичному цифровому субстраті.
                </strong>
              </div>

              <div className="concept-stat-grid p-8">
                <article className="concept-metric-card ">
                  <span>Загальна ліквідність</span>
                  <strong>$842,091.12</strong>
                  <em>+12.4%</em>
                </article>
                <article className="concept-metric-card">
                  <span>Активні стеки</span>
                  <strong>
                    14,204 <small>ETH</small>
                  </strong>
                  <em>В процесі</em>
                </article>
              </div>

              <div className="concept-hero-widgets">
                <article className="concept-flow-widget">
                  <div>
                    <span>Активні стеки</span>
                    <strong>02.07.2026</strong>
                  </div>
                  <div className="concept-flow-bars" aria-hidden="true">
                    {flowBars.map((height, index) => (
                      <i key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </article>

                <div className="concept-mini-grid">
                  <article className="concept-mini-card">
                    <span className="concept-mini-icon concept-mini-icon--vault" />
                    <small>VAULT</small>
                    <strong>Secured</strong>
                  </article>
                  <article className="concept-mini-card concept-mini-card--blue">
                    <span className="concept-mini-icon concept-mini-icon--gas" />
                    <small>GAS FEE</small>
                    <strong>14 gwei</strong>
                  </article>
                </div>

                <button type="button" className="concept-team-pill">
                  <span className="concept-avatars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>Команда</span>
                </button>
              </div>
            </section>

            <section className="concept-lower-grid">
              <article className="concept-market-card">
                <header>
                  <h2>Market Sentiment</h2>
                  <div>
                    <button type="button">24H</button>
                    <button type="button">7D</button>
                  </div>
                </header>

                <div className="concept-market-list">
                  {marketRows.map((row) => (
                    <div className="concept-market-row" key={row.asset}>
                      <span
                        className={`concept-coin concept-coin--${row.tone}`}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{row.asset}</strong>
                        <small>{row.pair}</small>
                      </div>
                      <em>
                        {row.value}
                        <small>{row.change}</small>
                      </em>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="concept-side-stack">
                <article className="concept-insight-card">
                  <h2>Альфа інсайд</h2>
                  <p>Наш нейронний двигун прогнозує 7,2% ймовірність бичачого прориву.</p>
                  <button type="button">Читати звіт</button>
                </article>

                <article className="concept-upgrade-card">
                  <span aria-hidden="true">✦</span>
                  <h2>Upgrade Nexus</h2>
                  <p>UNLOCK ADVANCED LAYERS</p>
                </article>
              </aside>
            </section>
          </main>
        </section>
      </Page>
    </AppLayout>
  );
}

export default ConceptPage;
