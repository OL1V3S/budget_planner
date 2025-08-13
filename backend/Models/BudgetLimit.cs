public class BudgetLimit
{
    public int Id { get; set; }
    public string Category { get; set; } = "";
    public decimal LimitAmount { get; set; }
    public DateTime MonthYear { get; set; }
    public string? ResetFrequency { get; set; } // "None", "Weekly", etc.
    public DateTime? LastReset { get; set; }
    public DateTime? NextReset { get; set; }


    
    public int? RecurrenceDays { get; set; }  
    public decimal AmountSpent { get; set; }  // total spent amount in current cycle
    public decimal UsedPercentage { get; set; }  // computed usage percentage
}
