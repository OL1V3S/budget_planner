import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, ChartNoAxesCombined, Landmark, ReceiptText } from "lucide-react";
import Card from "../../shared/ui/Card";

export default function OverviewPage() {
  return (
    <div className="shell-page">
      <section className="overview-grid" aria-label="Planning tools">
          <div className="overview-hero">
            <div className="overview-hero__content">
              <p className="page-header__eyebrow">Personal finance workspace</p>
              <h1>Welcome back</h1>
              <p>Your finances now have a clearer home. Use the tools already available today while dedicated experiences continue to take shape.</p>
              <Link className="button-link" to="/transactions">Open transactions <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
          <Card className="overview-module overview-module--transactions">
            <div className="overview-module__heading">
              <ReceiptText size={24} aria-hidden="true" />
              <span className="overview-module__status">Available now</span>
            </div>
            <div><h2 className="h2">Transactions</h2><p>Record, edit, search, filter, and review expenses in the established workspace.</p></div>
            <Link to="/transactions">Open transactions <span aria-hidden="true">→</span></Link>
          </Card>
          <Card className="overview-module overview-module--budgets">
            <div className="overview-module__heading"><BarChart3 size={22} aria-hidden="true" /><span className="overview-module__status">Shared workspace</span></div>
            <div><h3>Budgets</h3><p>Set monthly category limits in the existing workspace.</p></div>
            <Link to="/budgets">View budget route <span aria-hidden="true">→</span></Link>
          </Card>
          <Card className="overview-module overview-module--analytics">
            <div className="overview-module__heading"><ChartNoAxesCombined size={22} aria-hidden="true" /><span className="overview-module__status">Shared workspace</span></div>
            <div><h3>Analytics</h3><p>Access the current spending-versus-limit chart.</p></div>
            <Link to="/analytics">View analytics route <span aria-hidden="true">→</span></Link>
          </Card>
          <Card className="overview-module overview-module--investing">
            <div className="overview-module__heading"><Landmark size={22} aria-hidden="true" /><span className="overview-module__status">Coming later</span></div>
            <div><h3 id="future-tools-heading">Investing</h3><p>No portfolio or external service is connected today.</p></div>
            <Link to="/investing">See status <span aria-hidden="true">→</span></Link>
          </Card>
      </section>
    </div>
  );
}
