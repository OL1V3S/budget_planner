namespace BudgetPlanner.Contracts.Expenses;

public sealed record ExpenseResponse(
    int Id,
    string Description,
    decimal Amount,
    DateOnly Date,
    string Category);
