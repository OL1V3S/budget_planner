import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../shared/api/authApi";
import AuthShell from "./AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [resendMessage, setResendMessage] = useState("");
  const [resendTone, setResendTone] = useState("info");
  const [isResending, setIsResending] = useState(false);
  const emailId = useId();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await authApi.forgotPassword({ email });
      setMessageTone("info");
      setMessage(res.data.message);
    } catch {
      setMessageTone("danger");
      setMessage("Something went wrong.");
    }
  }

  async function handleResendConfirmation() {
    if (!email || isResending) return;

    setIsResending(true);
    setResendMessage("");

    try {
      const response = await authApi.resendConfirmation({ email });
      setResendTone("success");
      setResendMessage(response.data.message);
    } catch (err) {
      setResendTone("danger");
      if (err.response?.status === 429) {
        setResendMessage("Too many requests. Please wait before trying again.");
      } else {
        setResendMessage("Unable to request another confirmation email right now.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      description="Enter your email and we’ll send you a reset link."
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-field__label" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-primary-action">
          Send Reset Link
        </button>
      </form>

      {message && (
        <p
          className={`auth-status auth-status--${messageTone}`}
          role={messageTone === "danger" ? "alert" : "status"}
        >
          {message}
        </p>
      )}

      <section className="auth-secondary" aria-label="Account confirmation help">
        <details className="auth-disclosure">
          <summary className="auth-disclosure__summary">
            Need a new confirmation email?
          </summary>
          <div className="auth-actions">
            <p className="auth-help">
              Enter your account email above, then request another confirmation link.
            </p>
            <button
              type="button"
              className="button-ghost auth-text-action"
              onClick={handleResendConfirmation}
              disabled={!email || isResending}
            >
              {isResending ? "Requesting..." : "Resend confirmation email"}
            </button>
          </div>
        </details>
        {resendMessage && (
          <p
            className={`auth-status auth-status--${resendTone}`}
            role={resendTone === "danger" ? "alert" : "status"}
          >
            {resendMessage}
          </p>
        )}
      </section>

      <div className="auth-actions auth-actions--secondary">
        <button
          type="button"
          className="button-ghost auth-text-action"
          onClick={() => navigate("/")}
        >
          Back to login
        </button>
      </div>
    </AuthShell>
  );
}
