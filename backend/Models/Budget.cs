namespace BudgetPlanner.Models;

public class Budget
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal TotalLimit { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
