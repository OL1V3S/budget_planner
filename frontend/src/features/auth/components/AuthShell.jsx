import { useId } from "react";

export default function AuthShell({ title, description, children }) {
  const titleId = useId();

  return (
    <div className="auth-page">
      <main className="auth-card" aria-labelledby={titleId}>
        <p className="auth-shell__brand">ordo</p>
        <header className="auth-shell__header">
          <h1 id={titleId}>{title}</h1>
          {description && <p className="auth-help">{description}</p>}
        </header>
        <div className="auth-shell__content">{children}</div>
      </main>
    </div>
  );
}
