namespace BudgetPlanner.Import;

public enum ImportedTransactionDirection
{
    Debit,
    Credit,
    Unresolved
}

public enum ImportedRowClassification
{
    ExpenseCandidate,
    NonExpense,
    NeedsReview,
    Invalid
}

public sealed record ImportRowProvenance(
    string SourceType,
    string ParserRuleVersion,
    int SourcePageNumber,
    string SourceSection,
    int SourceRowOrdinal);

public sealed record NormalizedImportedRow(
    int SourceRowOrdinal,
    DateOnly? PostedDate,
    decimal? Amount,
    ImportedTransactionDirection Direction,
    string SourceDescription,
    string SourceSection,
    ImportedRowClassification Classification,
    string? EditableExpenseDescription,
    string? Category,
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings,
    ImportRowProvenance Provenance);
