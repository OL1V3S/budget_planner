import { Link } from "react-router-dom";
import { PLAN_DESTINATIONS } from "../navigation";

export default function PlanPage() {
  return (
    <div className="shell-page navigation-hub">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Plan</p>
          <h1>Plan</h1>
          <p className="muted">Build a practical plan for spending, recurring commitments, and income.</p>
        </div>
      </header>

      <div className="navigation-hub__cards">
        {PLAN_DESTINATIONS.map((destination) => {
          const { to, label, icon: Icon, description } = destination;
          return (
            <Link className="card navigation-hub__link" to={to} key={to}>
              <Icon className="navigation-hub__icon" size={24} aria-hidden="true" />
              <h2 className="h2">{label}</h2>
              <span className="navigation-hub__description">{description}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
