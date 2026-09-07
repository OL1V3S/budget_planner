import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExpenseList from "./ExpenseList";

const expense = {
  id: 7,
  description: "coffee",
  amount: 4.5,
  date: "2026-08-14",
  category: "food",
};

function listProps(overrides = {}) {
  return {
    expenses: [expense],
    totalCount: 1,
    filteredCount: 1,
    entriesPerPage: 10,
    showAll: false,
    onShowAll: vi.fn(),
    editingExpenseId: null,
    editingExpenseData: {},
    setEditingExpenseData: vi.fn(),
    onStartEdit: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe("ExpenseList", () => {
  it("distinguishes an empty collection from filters with no matches", () => {
    const { rerender } = render(<ExpenseList {...listProps({ expenses: [], totalCount: 0 })} />);
    expect(screen.getByText("No expenses recorded yet.")).toBeInTheDocument();

    rerender(<ExpenseList {...listProps({ expenses: [], totalCount: 3 })} />);
    expect(screen.getByText("No expenses match these filters.")).toBeInTheDocument();
  });

  it("keeps one table DOM with mobile labels and passes the edit opener", async () => {
    const user = userEvent.setup();
    const onStartEdit = vi.fn();
    render(<ExpenseList {...listProps({ onStartEdit })} />);

    const tableRegion = screen.getByRole("region", { name: "Expenses table" });
    const row = within(tableRegion).getByText("Coffee").closest("tr");
    expect(within(tableRegion).getByText("Expenses", { selector: "caption" })).toBeInTheDocument();
    expect(row.querySelector('[data-label="Amount ($)"]')).toHaveTextContent("4.50");

    const editButton = within(row).getByRole("button", { name: "Edit" });
    await user.click(editButton);
    expect(onStartEdit).toHaveBeenCalledWith(expense, editButton);
  });

  it("locks other row actions and keeps an unavailable read draft cancelable", () => {
    const { rerender } = render(<ExpenseList {...listProps({ taskLocked: true })} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    rerender(<ExpenseList {...listProps({ editingExpenseId: 7, readUnavailable: true })} />);
    expect(screen.getByLabelText("Edit description")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();

    rerender(<ExpenseList {...listProps({ editingExpenseId: 7, busy: true })} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByLabelText("Edit description")).toBeDisabled();
    expect(screen.getByLabelText("Edit amount")).toBeDisabled();
    expect(screen.getByLabelText("Edit date")).toBeDisabled();
    expect(screen.getByLabelText("Edit category")).toBeDisabled();
  });
});
