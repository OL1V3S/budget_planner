import Card from "../../shared/ui/Card";
import ThemeControl from "../../shared/theme/ThemeControl";

export default function SettingsPage({ email }) {
  return (
    <div className="shell-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Settings</p>
          <h1>Settings</h1>
          <p className="muted">Review the signed-in account and presentation preferences supported on this device.</p>
        </div>
      </header>

      <div className="settings-grid">
        <Card as="section" className="settings-card">
          <h2 className="h2">Account</h2>
          <p className="field__label">Signed-in email</p>
          <p className="settings-value">{email}</p>
          <p className="muted">This identifies the account currently signed in to the workspace.</p>
        </Card>

        <Card as="section" className="settings-card">
          <h2 className="h2">Appearance</h2>
          <ThemeControl label="Theme preference" className="theme-control--settings" />
          <p className="muted settings-card__note">
            System follows this device’s appearance. Light or Dark is stored locally on this device.
          </p>
        </Card>
      </div>
    </div>
  );
}
