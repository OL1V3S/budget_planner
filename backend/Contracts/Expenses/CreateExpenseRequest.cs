namespace BudgetPlanner.Contracts.Expenses;

public sealed record CreateExpenseRequest(
    string? Description,
    decimal Amount,
    DateOnly Date,
    string? Category);
