import { useId } from "react";

export default function FormField({ label, children, className = "" }) {
  const id = useId();
  return (
    <label className={`field ${className}`.trim()} htmlFor={id}>
      <span className="field__label">{label}</span>
      {typeof children === "function" ? children(id) : children}
    </label>
  );
}
