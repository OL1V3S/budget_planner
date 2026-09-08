import { Link } from "react-router-dom";
import { MORE_DESTINATIONS } from "../navigation";
import "../../styles/secondary-pages.css";

export default function MorePage() {
  return (
    <div className="shell-page secondary-page">
      <header className="page-header">
        <div>
          <h1>More</h1>
          <p className="muted">Settings and other secondary tools.</p>
        </div>
      </header>

      <nav aria-label="More destinations">
        <ul className="secondary-links secondary-links--more">
        {MORE_DESTINATIONS.map((destination) => {
          const { to, label, icon: Icon, description } = destination;
          const unavailable = to === "/investing";
          return (
            <li className={unavailable ? "secondary-links__subordinate" : ""} key={to}>
              <Link className="secondary-link" to={to}>
                <Icon className="secondary-link__icon" size={20} aria-hidden="true" />
                <span className="secondary-link__body">
                  <span className="secondary-link__title-row">
                    <span className="secondary-link__label">{label}</span>
                    {unavailable && <span className="secondary-link__status">Unavailable</span>}
                  </span>
                  <span className="secondary-link__description">{description}</span>
                </span>
              </Link>
            </li>
          );
        })}
        </ul>
      </nav>
    </div>
  );
}
