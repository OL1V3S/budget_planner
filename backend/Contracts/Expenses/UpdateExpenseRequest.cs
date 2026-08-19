namespace BudgetPlanner.Contracts.Expenses;

public sealed record UpdateExpenseRequest(
    int Id,
    string? Description,
    decimal Amount,
    DateOnly Date,
    string? Category);
