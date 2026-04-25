import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../shared/api/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await authApi.forgotPassword({ email });
      setMessage(res.data.message);
    } catch {
      setMessage("Something went wrong.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Budget Planner</h1>
        <h2 className="h2">Forgot Password</h2>

        <p className="auth-help">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="auth-form mt-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Send Reset Link</button>
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