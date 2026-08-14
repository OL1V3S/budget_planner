import { useTheme } from "./useTheme";

export default function ThemeControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-control">
      <label htmlFor="theme-preference">Theme</label>
      <select id="theme-preference" value={theme} onChange={(event) => setTheme(event.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
