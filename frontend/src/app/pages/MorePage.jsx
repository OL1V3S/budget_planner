import { Link } from "react-router-dom";
import { MORE_DESTINATIONS } from "../navigation";

export default function MorePage() {
  return (
    <div className="shell-page navigation-hub">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">More</p>
          <h1>More</h1>
          <p className="muted">Find additional workspace tools and preferences.</p>
        </div>
      </header>

      <div className="navigation-hub__list">
        {MORE_DESTINATIONS.map((destination) => {
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
