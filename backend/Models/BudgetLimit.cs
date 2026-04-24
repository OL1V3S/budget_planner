namespace BudgetPlanner.Models;

// Each budget limit belongs to ONE account

public class BudgetLimit
{
    public int Id { get; set; }
    public string Category { get; set; } = "";
    public decimal LimitAmount { get; set; }
    public DateTime MonthYear { get; set; }

    public string UserId { get; set; } = "";
    public ApplicationUser? User { get; set; }
}