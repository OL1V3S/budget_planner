import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "../../../shared/api/authApi";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

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

      setMessage("Password reset successful. You can now log in.");
    } catch {
      setMessage("Error resetting password.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Budget Planner</h1>
        <h2 className="h2">Reset Password</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit">Reset Password</button>
        </form>

        {message && <p className="auth-help">{message}</p>}

        <button
          type="button"
          className="button-ghost"
          onClick={() => navigate("/")}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}