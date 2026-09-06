import {
  BarChart3,
  ChartNoAxesCombined,
  Ellipsis,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Repeat2,
  Settings,
  WalletCards,
} from "lucide-react";

export const APP_DESTINATIONS = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/budgets", label: "Budgets", icon: BarChart3, description: "Set and review monthly category limits." },
  { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { to: "/commitments", label: "Commitments", icon: Repeat2, description: "Review recurring expenses and manage saved commitments." },
  { to: "/paychecks", label: "Paychecks", icon: WalletCards, description: "Review deposits and manage saved paycheck expectations." },
  { to: "/investing", label: "Investing", icon: Landmark, description: "Unavailable today. View the planned investing workspace." },
  { to: "/settings", label: "Settings", icon: Settings, description: "Review your account and theme preference." },
];

export const PLAN_DESTINATIONS = APP_DESTINATIONS.filter(({ to }) =>
  ["/budgets", "/commitments", "/paychecks"].includes(to));
export const MORE_DESTINATIONS = APP_DESTINATIONS.filter(({ to }) =>
  ["/investing", "/settings"].includes(to));

export const MOBILE_DESTINATIONS = [
  { to: "/overview", label: "Home", icon: LayoutDashboard, paths: ["/overview"] },
  { to: "/transactions", label: "Activity", icon: ReceiptText, paths: ["/transactions"] },
  { to: "/plan", label: "Plan", icon: WalletCards, paths: ["/plan", ...PLAN_DESTINATIONS.map(({ to }) => to)] },
  { to: "/analytics", label: "Insights", icon: ChartNoAxesCombined, paths: ["/analytics"] },
  { to: "/more", label: "More", icon: Ellipsis, paths: ["/more", ...MORE_DESTINATIONS.map(({ to }) => to)] },
];

export function getMobileDestination(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return MOBILE_DESTINATIONS.find(({ paths }) => paths.includes(path));
}
