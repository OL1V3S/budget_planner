namespace BudgetPlanner.Contracts.ImportPreviews;

public sealed record ImportPreviewError(string Code, string Message);

public sealed record ImportPreviewResponse(
    Guid BatchId,
    string SourceType,
    string ParserRuleVersion,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    IReadOnlyList<ImportPreviewRowResponse> Rows);

public sealed record ImportPreviewRowResponse(
    Guid RowId,
    int SourceRowOrdinal,
    DateOnly? PostedDate,
    decimal? Amount,
    string Direction,
    string SourceDescription,
    string SourceSection,
    string Classification,
    bool IsEligible,
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings,
    bool IsPossibleDuplicate,
    IReadOnlyList<int> DuplicateExpenseIds,
    string? EditableExpenseDescription,
    string? Category,
    bool SelectedForImport);

public sealed record UpdateImportPreviewRowRequest(
    string? EditableExpenseDescription,
    string? Category,
    bool SelectedForImport);
