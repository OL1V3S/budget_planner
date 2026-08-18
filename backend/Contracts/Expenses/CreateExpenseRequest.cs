namespace BudgetPlanner.Contracts.Expenses;

public sealed record CreateExpenseRequest(
    string? Description,
    decimal Amount,
    DateTime Date,
    string? Category);
