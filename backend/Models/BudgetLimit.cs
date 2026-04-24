public class BudgetLimit
{
    public int Id { get; set; }
    public string Category { get; set; } = "";
    public decimal LimitAmount { get; set; }
    public DateTime MonthYear { get; set; }
}
