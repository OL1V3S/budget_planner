import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./AnalyticsPage";
import { useExpenses } from "../../expenses/hooks/useExpenses";
import { useBudgetLimits } from "../../budgetLimits/hooks/useBudgetLimits";
import { useCashFlow } from "../hooks/useCashFlow";
import { cashFlowFixture } from "../testFixtures";

vi.mock("../hooks/useCashFlow", () => ({ useCashFlow: vi.fn() }));
vi.mock("react-chartjs-2", () => ({ Bar: () => <canvas data-testid="cash-flow-chart" /> }));
vi.mock("../../expenses/hooks/useExpenses", () => ({ useExpenses: vi.fn() }));
vi.mock("../../budgetLimits/hooks/useBudgetLimits", () => ({ useBudgetLimits: vi.fn() }));

const refreshExpenses = vi.fn();
const refreshLimits = vi.fn();
const refreshCashFlow = vi.fn();

function loadedCashFlow(month = "2026-08", overrides = {}) {
  const data = cashFlowFixture(month, month === "2026-07" ? { spentMinor: "7500", netMinor: "7500" } : {});
  if (month === "2026-07") data.categories = [{ category: "bills", amountMinor: "7500" }];
  return { data, loading: false, error: null, availableMonths: data.availableMonths, refresh: refreshCashFlow, ...overrides };
}

function renderPage() {
  return render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
}

describe("monthly spending insights page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 14, 12, 0, 0));
    useCashFlow.mockImplementation((month) => loadedCashFlow(month));
    useExpenses.mockReturnValue({
      expenses: [
        { id: 1, description: "Groceries", category: "food", amount: 90, date: "2026-08-02" },
        { id: 2, description: "Train", category: "transport", amount: 10, date: "2026-08-03" },
        { id: 3, description: "Rent", category: "bills", amount: 75, date: "2026-07-02" },
      ],
      loading: false,
      error: null,
      refresh: refreshExpenses,
    });
    useBudgetLimits.mockReturnValue({
      budgetLimits: [
        { id: 1, category: "food", limitAmount: 100 },
        { id: 2, category: "transport", limitAmount: 0 },
      ],
      loading: false,
      error: null,
      refresh: refreshLimits,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows the selected total, ranked categories, budgets, comparison, and largest expenses", () => {
    renderPage();

    expect(screen.getByLabelText("Month")).toHaveValue("2026-08");
    expect(useBudgetLimits).toHaveBeenLastCalledWith("2026-08");
    expect(screen.getByRole("heading", { name: "Recorded cash in vs Spent" }).closest("section")).toHaveTextContent("$100.00");

    const breakdown = screen.getByRole("heading", { name: "Where it went" }).closest("section");
    const rows = within(breakdown).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Food");
    expect(rows[0]).toHaveTextContent("$90.00 · 90.0%");
    expect(rows[1]).toHaveTextContent("Transport");

    const budget = screen.getByRole("heading", { name: "Budget status by category" }).closest("section");
    expect(budget).toHaveTextContent("Near Limit");
    expect(budget).toHaveTextContent("Percentage used: Not applicable for a $0 limit");

    expect(screen.getByRole("heading", { name: "Month-over-month change" }).closest("section"))
      .toHaveTextContent("+$25.00");
    expect(screen.getByRole("heading", { name: "Largest expenses" }).closest("section"))
      .toHaveTextContent("Groceries");
    expect(screen.getByRole("link", { name: "Review transactions" })).toHaveAttribute("href", "/transactions");
  });

  it("offers current and represented historical months and updates selected-month limits", () => {
    renderPage();
    const selector = screen.getByLabelText("Month");
    expect(within(selector).getAllByRole("option").map(({ value }) => value)).toEqual(["2026-08", "2026-07"]);

    fireEvent.change(selector, { target: { value: "2026-07" } });
    expect(useBudgetLimits).toHaveBeenLastCalledWith("2026-07");
    expect(screen.getByRole("heading", { name: "Recorded cash in vs Spent" }).closest("section"))
      .toHaveTextContent("$75.00");
  });

  it("renders expense loading and blocking error states without transient insights", () => {
    useExpenses.mockReturnValue({ expenses: [], loading: true, error: null, refresh: refreshExpenses });
    const { rerender } = renderPage();
    expect(screen.getByText("Loading spending insights...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Largest expenses" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recorded cash in vs Spent" })).toBeInTheDocument();

    useExpenses.mockReturnValue({ expenses: [], loading: false, error: new Error("failed"), refresh: refreshExpenses });
    rerender(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load recorded expenses");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refreshExpenses).toHaveBeenCalledOnce();
  });

  it("keeps expense insights visible when budget limits fail", () => {
    useBudgetLimits.mockReturnValue({
      budgetLimits: [], loading: false, error: new Error("failed"), refresh: refreshLimits,
    });
    renderPage();

    expect(screen.getByRole("heading", { name: "Recorded cash in vs Spent" }).closest("section")).toHaveTextContent("$100.00");
    expect(screen.getByRole("alert")).toHaveTextContent("Budget limits are unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refreshLimits).toHaveBeenCalledOnce();
  });

  it("shows honest empty states for a month without expenses or limits", () => {
    const empty = cashFlowFixture("2026-08", { cashInMinor: "0", paycheckCashInMinor: "0", otherCashInMinor: "0", spentMinor: "0", netMinor: "0" });
    empty.categories = [];
    useCashFlow.mockReturnValue(loadedCashFlow("2026-08", { data: empty }));
    useExpenses.mockReturnValue({ expenses: [], loading: false, error: null, refresh: refreshExpenses });
    useBudgetLimits.mockReturnValue({ budgetLimits: [], loading: false, error: null, refresh: refreshLimits });
    renderPage();

    expect(screen.getByRole("heading", { name: "Month-over-month change" }).closest("section")).toHaveTextContent("$0.00");
    expect(screen.getAllByText("No spending recorded").length).toBeGreaterThan(0);
    expect(screen.getByText("No cash in recorded")).toBeInTheDocument();
    expect(screen.getByText("No budget limits are set for this month.")).toBeInTheDocument();
    expect(screen.getByText("No category changes to show between these months.")).toBeInTheDocument();
    expect(screen.getByText("No expenses to rank for this month.")).toBeInTheDocument();
    expect(screen.getByText("Neither month has recorded spending.")).toBeInTheDocument();
  });
  it("offers historical months represented only by other recorded inflows", () => {
    useCashFlow.mockReturnValue(loadedCashFlow("2026-08", { availableMonths: ["2026-08", "2026-07", "2026-02"] }));
    renderPage();
    expect(within(screen.getByLabelText("Month")).getAllByRole("option").map(({ value }) => value))
      .toEqual(["2026-08", "2026-07", "2026-02"]);
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2026-02" } });
    expect(useCashFlow).toHaveBeenLastCalledWith("2026-02");
  });

  it("keeps all four cash-flow views unavailable during initial loading and retryable failure", () => {
    useCashFlow.mockReturnValue(loadedCashFlow("2026-08", { data: null, loading: true }));
    const { rerender } = renderPage();
    expect(screen.getByRole("region", { name: "Recorded cash flow" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading recorded cash flow...")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("heading", { name: "Recorded cash in vs Spent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Where it went" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("cash-flow-chart")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Largest expenses" })).toBeInTheDocument();
    useCashFlow.mockReturnValue(loadedCashFlow("2026-08", { data: null, error: "We couldn’t load recorded cash flow. Try again." }));
    rerender(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(screen.getByRole("region", { name: "Recorded cash flow" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load recorded cash flow");
    fireEvent.click(screen.getByRole("button", { name: "Retry cash flow" }));
    expect(refreshCashFlow).toHaveBeenCalledOnce();
  });

  it("shows exact custom and uncategorized amounts sorted before rounding with lexical ties", () => {
    const data = cashFlowFixture();
    data.selected.spentMinor = "2999999999999999996";
    data.categories = [
      { category: "uncategorized", amountMinor: "999999999999999999" },
      { category: "a custom category", amountMinor: "999999999999999999" },
      { category: "other custom", amountMinor: "999999999999999998" },
    ];
    useCashFlow.mockReturnValue(loadedCashFlow("2026-08", { data }));
    renderPage();
    const panel = screen.getByRole("heading", { name: "Where it went" }).closest("section");
    const rows = within(panel).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("A Custom Category");
    expect(rows[0]).toHaveTextContent("$9,999,999,999,999,999.99 · 33.3%");
    expect(rows[1]).toHaveTextContent("Uncategorized");
    expect(rows[2]).toHaveTextContent("$9,999,999,999,999,999.98");
  });

});
