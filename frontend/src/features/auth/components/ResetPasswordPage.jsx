import { useId, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../../shared/api/authApi";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const passwordId = useId();

  const email = searchParams.get("email");
  const token = searchParams.get("token");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await authApi.resetPassword({
        email,
        token,
        newPassword: password,
      });

      setMessageTone("success");
      setMessage("Password reset successful. You can now log in.");
    } catch {
      setMessageTone("danger");
      setMessage("Error resetting password.");
    }
  }

  return (
    <AuthShell title="Reset password">
      <form onSubmit={handleSubmit} className="auth-form">
        <PasswordField
          id={passwordId}
          label="New password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isRevealed={showPassword}
          onToggle={() => setShowPassword((previous) => !previous)}
        />

        <button type="submit" className="auth-primary-action">
          Reset Password
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
