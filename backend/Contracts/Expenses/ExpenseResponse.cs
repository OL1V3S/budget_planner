namespace BudgetPlanner.Contracts.Expenses;

public sealed record ExpenseResponse(
    int Id,
    string Description,
    decimal Amount,
    DateTime Date,
    string Category);
