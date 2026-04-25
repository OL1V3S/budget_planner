import { useState } from "react";
import { authApi } from "../../../shared/api/authApi";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (mode === "register" && password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      if (mode === "register") {
        await authApi.register({ email, password });
        alert("Account created. Please confirm your email before logging in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const res = await authApi.login({ email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("email", res.data.email);

      onLogin();
    } catch (err) {
      console.log("Auth error:", err.response?.data || err.message);

      const errorData = err.response?.data;

      if (Array.isArray(errorData)) {
        alert(errorData.map((e) => e.description).join("\n"));
      } else if (typeof errorData === "string") {
        alert(errorData);
      } else {
        alert(err.message || "Something went wrong.");
      }
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Budget Planner</h1>
        <h2 className="h2">
          {mode === "login" ? "Log In" : "Create Account"}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

        <div className="password-field">
        <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
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

        {mode === "login" && (
            <button
            type="button"
            className="button-ghost"
            onClick={() => navigate("/forgot-password")}
            >
            Forgot password?
            </button>
        )}


          {mode === "register" && (
            <>
              <div className="password-field">
                <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
               </div>

            <p className="auth-help">Password must include:</p>
            <ul className="auth-help">
            <li>At least 6 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
            </ul>
            </>
          )}

          <button type="submit">
            {mode === "login" ? "Log In" : "Register"}
          </button>
        </form>

        <button className="button-ghost" onClick={switchMode}>
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}