namespace BudgetPlanner.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
