import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ExpensesPage from "../features/expenses/components/ExpensesPage";
import AuthPage from "../features/auth/components/AuthPage";
import ConfirmEmailPage from "../features/auth/components/ConfirmEmailPage";
import ForgotPasswordPage from "../features/auth/components/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/components/ResetPasswordPage";
import ThemeControl from "../shared/theme/ThemeControl";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
  }

  function Dashboard() {
    return (
      <>
        <div className="top-bar">
          <span className="top-bar__identity">{localStorage.getItem("email")}</span>
          <button className="button-ghost" onClick={handleLogout}>Logout</button>
        </div>

        <ExpensesPage />
      </>
    );
  }

  return (
    <>
      <div className="theme-dock"><ThemeControl /></div>
      <Routes>
      <Route
        path="/"
        element={
          isLoggedIn ? (
            <Dashboard />
          ) : (
            <AuthPage onLogin={() => setIsLoggedIn(true)} />
          )
        }
      />

      <Route path="/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
