namespace BudgetPlanner.Models;

// An expense belongs to ONE user

public class Expense
{
    public int Id { get; set; }
    public string Description { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string Category { get; set; } = "";

    public string UserId { get; set; } = "";
    public ApplicationUser? User { get; set; }
}