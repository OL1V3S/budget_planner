namespace BudgetPlanner.Contracts.Expenses;

public sealed record UpdateExpenseRequest(
    int Id,
    string? Description,
    decimal Amount,
    DateTime Date,
    string? Category);
