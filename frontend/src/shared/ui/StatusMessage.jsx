export default function StatusMessage({ tone = "info", children }) {
  return <p className={`status-message status-message--${tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</p>;
}
