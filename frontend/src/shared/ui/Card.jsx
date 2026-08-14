import { createElement } from "react";

export default function Card({ as = "div", className = "", children }) {
  return createElement(as, { className: `card ${className}`.trim() }, children);
}
