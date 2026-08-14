import { Landmark } from "lucide-react";
import Card from "../../shared/ui/Card";

export default function InvestingPage() {
  return (
    <div className="shell-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Investing</p>
          <h1>Investing</h1>
          <p className="muted">A future home for investment connections you choose.</p>
        </div>
      </header>
      <Card className="empty-state-card">
        <span className="empty-state-card__icon"><Landmark size={24} aria-hidden="true" /></span>
        <h2 className="h2">Not connected yet</h2>
        <p className="muted">No portfolio, brokerage, signal, or external integration is connected. Nothing is being fetched or inferred.</p>
      </Card>
    </div>
  );
}
