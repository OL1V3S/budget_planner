import Card from "../../shared/ui/Card";

export default function SettingsPage({ email }) {
  return (
    <div className="shell-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Settings</p>
          <h1>Settings</h1>
          <p className="muted">Review the account currently signed in to this workspace.</p>
        </div>
      </header>
      <Card>
        <p className="field__label">Account email</p>
        <p className="settings-value">{email}</p>
        <p className="muted">Theme preference is available in the workspace header and remains stored only on this device.</p>
      </Card>
    </div>
  );
}
