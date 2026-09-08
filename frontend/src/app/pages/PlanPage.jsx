import { Link } from "react-router-dom";
import { PLAN_DESTINATIONS } from "../navigation";
import "../../styles/secondary-pages.css";

export default function PlanPage() {
  return (
    <div className="shell-page secondary-page">
      <header className="page-header">
        <div>
          <h1>Plan</h1>
          <p className="muted">Choose an area to plan.</p>
        </div>
      </header>

      <nav aria-label="Planning tools">
        <ul className="secondary-links secondary-links--plan">
        {PLAN_DESTINATIONS.map((destination) => {
          const { to, label, icon: Icon } = destination;
          return (
            <li key={to}>
              <Link className="secondary-link" to={to}>
                <Icon className="secondary-link__icon" size={20} aria-hidden="true" />
                <span className="secondary-link__label">{label}</span>
              </Link>
            </li>
          );
        })}
        </ul>
      </nav>
    </div>
  );
}
