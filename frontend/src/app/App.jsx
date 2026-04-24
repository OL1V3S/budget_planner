import { useState } from "react";
import ExpensesPage from "../features/expenses/components/ExpensesPage";
import AuthPage from "../features/auth/components/AuthPage";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
  }

  if (!isLoggedIn) {
    return <AuthPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <>
      <div className="top-bar">
        <span>{localStorage.getItem("email")}</span>
        <button className="button-ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <ExpensesPage />
    </>
  );
}