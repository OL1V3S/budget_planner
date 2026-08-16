import { useId } from "react";
import { useTheme } from "./useTheme";

export default function ThemeControl({ label = "Theme", className = "" }) {
  const { theme, setTheme } = useTheme();
  const controlId = useId();

  return (
    <div className={`theme-control ${className}`.trim()}>
      <label htmlFor={controlId}>{label}</label>
      <select id={controlId} value={theme} onChange={(event) => setTheme(event.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
