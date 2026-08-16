import { Landmark } from "lucide-react";
import Card from "../../shared/ui/Card";

export default function InvestingPage() {
  return (
    <div className="shell-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Investing</p>
          <h1>Investing</h1>
          <p className="muted">A future home for investment information from sources you may choose.</p>
        </div>
      </header>

      <Card as="section" className="investing-status">
        <span className="empty-state-card__icon"><Landmark size={24} aria-hidden="true" /></span>
        <p className="investing-status__eyebrow">Unavailable today</p>
        <h2 className="h2">No investment source connected</h2>
        <p className="muted">
          No portfolio, brokerage, signal provider, market-data source, or other investment integration is connected.
          No investment data is being fetched, imported, inferred, or evaluated.
        </p>
      </Card>

      <section className="investing-capabilities" aria-labelledby="investing-capabilities-heading">
        <div className="section__header">
          <div>
            <p className="page-header__eyebrow">Future structure</p>
            <h2 id="investing-capabilities-heading" className="h2">Planned capability areas</h2>
          </div>
        </div>

        <div className="investing-capabilities__grid">
          <Card as="article" className="investing-capability">
            <span className="investing-capability__status">Not available</span>
            <h3>Connections</h3>
            <p>Future sources would require a source-specific adapter and a normalized application contract. No provider is supported today.</p>
          </Card>
          <Card as="article" className="investing-capability">
            <span className="investing-capability__status">Not available</span>
            <h3>Portfolio and positions</h3>
            <p>No portfolio values, holdings, or positions are available without a real source supplying them.</p>
          </Card>
          <Card as="article" className="investing-capability">
            <span className="investing-capability__status">Not available</span>
            <h3>Signals</h3>
            <p>No investment signals, recommendations, or trading guidance are generated.</p>
          </Card>
          <Card as="article" className="investing-capability">
            <span className="investing-capability__status">Not available</span>
            <h3>Activity and performance</h3>
            <p>No investment activity or performance information is available to report.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
