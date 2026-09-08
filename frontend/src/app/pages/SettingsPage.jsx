import Card from "../../shared/ui/Card";
import ThemeControl from "../../shared/theme/ThemeControl";
import "../../styles/secondary-pages.css";

export default function SettingsPage({ email }) {
  return (
    <div className="shell-page secondary-page settings-page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Choose how Ordo looks on this device.</p>
        </div>
      </header>

      <div className="settings-page__content">
        <Card as="section" className="settings-page__appearance">
          <h2 className="h2">Appearance</h2>
          <ThemeControl label="Theme preference" className="theme-control--settings" />
          <p className="muted settings-page__helper">System follows your device. Light or Dark is saved on this device.</p>
        </Card>

        <section className="settings-page__account" aria-labelledby="settings-account-heading">
          <h2 className="h2" id="settings-account-heading">Account</h2>
          <dl className="settings-page__account-row">
            <dt>Signed-in email</dt>
            <dd>{email}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
