using BudgetPlanner.Import;

namespace BudgetPlanner.Models;

public class ImportPreviewRow
{
    public Guid Id { get; set; }
    public Guid BatchId { get; set; }
    public ImportPreviewBatch? Batch { get; set; }
    public int SourceRowOrdinal { get; set; }
    public DateOnly? PostedDate { get; set; }
    public decimal? Amount { get; set; }
    public ImportedTransactionDirection Direction { get; set; }
    public string SourceDescription { get; set; } = "";
    public string SourceSection { get; set; } = "";
    public int SourcePageNumber { get; set; }
    public ImportedRowClassification Classification { get; set; }
    public bool IsEligible { get; set; }
    public string ValidationErrorCodes { get; set; } = "[]";
    public string WarningCodes { get; set; } = "[]";
    public bool IsPossibleDuplicate { get; set; }
    public string DuplicateExpenseIds { get; set; } = "[]";
    public string? EditableExpenseDescription { get; set; }
    public string? Category { get; set; }
    public bool SelectedForImport { get; set; }
}
