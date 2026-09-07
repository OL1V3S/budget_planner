import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../../shared/api/authApi";
import AuthShell from "./AuthShell";

const confirmationCopy = {
  loading: {
    title: "Confirming email",
    message: "Please wait...",
    tone: "info",
  },
  success: {
    title: "Email confirmed",
    message: "You can now log in.",
    tone: "success",
  },
  error: {
    title: "Unable to confirm email",
    message:
      "This confirmation link is invalid, expired, or already used. Try logging in or request a new confirmation email.",
    tone: "danger",
  },
};

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const hasRun = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const userId = searchParams.get("userId");
    const token = searchParams.get("token");

    async function confirm() {
      try {
        await authApi.confirmEmail({ userId, token });
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }

    if (userId && token) confirm();
    else setStatus("error");
  }, [searchParams]);

  const content = confirmationCopy[status];

  return (
    <AuthShell title={content.title}>
      <p
        className={`auth-status auth-status--${content.tone}`}
        role={content.tone === "danger" ? "alert" : "status"}
        aria-live={content.tone === "danger" ? "assertive" : "polite"}
      >
        {content.message}
      </p>

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
