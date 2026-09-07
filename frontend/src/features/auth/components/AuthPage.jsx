import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../shared/api/authApi";
import { establishSession } from "../../../shared/auth/session";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendTone, setResendTone] = useState("info");
  const [formError, setFormError] = useState(null);
  const [isResending, setIsResending] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const passwordRequirementsId = useId();
  const formErrorRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (mode === "register" && password !== confirmPassword) {
      setFormError({ message: "Passwords do not match." });
      return;
    }

    try {
      if (mode === "register") {
        await authApi.register({ email, password });
        setMode("check-email");
        setConfirmationMessage(`A confirmation link was sent to ${email}.`);
        setResendMessage("");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const res = await authApi.login({ email, password });

      establishSession(res.data.token, res.data.email);

      onLogin?.();
    } catch (err) {
      console.log("Auth error:", err.response?.data || err.message);

      const errorData = err.response?.data;

      if (errorData?.code === "confirmation_email_delivery_failed") {
        setMode("check-email");
        setConfirmationMessage(errorData.message);
        setPassword("");
        setConfirmPassword("");
        setResendMessage("");
        return;
      }

      if (Array.isArray(errorData)) {
        setFormError({
          message: errorData.map((error) => error.description).join("\n"),
        });
      } else if (typeof errorData === "string") {
        setFormError({ message: errorData });
      } else if (typeof errorData?.message === "string") {
        setFormError({ message: errorData.message });
      } else {
        setFormError({ message: err.message || "Something went wrong." });
      }
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

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setConfirmationMessage("");
    setResendMessage("");
    setFormError(null);
    setPassword("");
    setConfirmPassword("");
  }

  function returnToLogin() {
    setMode("login");
    setConfirmationMessage("");
    setResendMessage("");
    setFormError(null);
  }

  if (mode === "check-email") {
    return (
      <AuthShell title="Check your email">
        <p className="auth-status auth-status--info" role="status">
          {confirmationMessage}
        </p>
        <p className="auth-help">
          Confirm <strong>{email}</strong> before logging in.
        </p>
        {resendMessage && (
          <p
            className={`auth-status auth-status--${resendTone}`}
            role={resendTone === "danger" ? "alert" : "status"}
          >
            {resendMessage}
          </p>
        )}
        <div className="auth-actions">
          <button
            type="button"
            className="auth-primary-action"
            onClick={handleResendConfirmation}
            disabled={!email || isResending}
          >
            {isResending ? "Requesting..." : "Resend confirmation email"}
          </button>
          <button
            type="button"
            className="button-ghost auth-text-action"
            onClick={returnToLogin}
          >
            Back to login
          </button>
        </div>
      </AuthShell>
    );
  }

  const isLogin = mode === "login";

  return (
    <AuthShell title={isLogin ? "Log in" : "Create account"}>
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

        <PasswordField
          id={passwordId}
          label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isRevealed={showPassword}
          onToggle={() => setShowPassword((previous) => !previous)}
          describedBy={isLogin ? undefined : passwordRequirementsId}
        />

        {isLogin && (
          <button
            type="button"
            className="button-ghost auth-text-action"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot password?
          </button>
        )}

        {!isLogin && (
          <>
            <PasswordField
              id={confirmPasswordId}
              label="Confirm password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              isRevealed={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((previous) => !previous)}
            />

            <div
              id={passwordRequirementsId}
              className="auth-password-requirements auth-help"
            >
              <p>Password must include:</p>
              <ul>
                <li>At least 6 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </div>
          </>
        )}

        {formError && (
          <p
            ref={formErrorRef}
            className="auth-status auth-status--danger"
            role="alert"
            tabIndex="-1"
          >
            {formError.message}
          </p>
        )}

        <button type="submit" className="auth-primary-action">
          {isLogin ? "Log In" : "Register"}
        </button>
      </form>

      <div className="auth-actions auth-actions--secondary">
        <button
          type="button"
          className="button-ghost auth-text-action"
          onClick={switchMode}
        >
          {isLogin
            ? "Need an account? Register"
            : "Already have an account? Log in"}
        </button>
      </div>
    </AuthShell>
  );
}
