import { Link } from "react-router-dom";
import Card from "../../shared/ui/Card";

export default function CompatibilityPage({ title, description, actionLabel }) {
  return (
    <div className="shell-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">{title}</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </header>
      <Card className="empty-state-card">
        <h2 className="h2">Available in the current workspace</h2>
        <p className="muted">No calculations or data ownership have moved. Continue to the existing combined experience.</p>
        <Link className="button-link" to="/transactions">{actionLabel}</Link>
      </Card>
    </div>
  );
}
