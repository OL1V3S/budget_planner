public class Expense
{
    public int Id { get; set; }
    public string Description { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string Category { get; set; } = "";  
    public bool Recurring { get; set; }    
    public string? Recurrence { get; set; }  // "Weekly", "Biweekly", "Monthly", or null/empty for none
     
}
