namespace BudgetPlanner.Import.Sunflower;

public sealed record SunflowerStatementParseFailure(string Code, string Message)
{
    public static readonly SunflowerStatementParseFailure UnsupportedSource =
        new("unsupported_statement_source", "The statement source is not supported.");

    public static readonly SunflowerStatementParseFailure UnsupportedFormat =
        new("unsupported_statement_format", "The statement format is not supported.");

    public static readonly SunflowerStatementParseFailure CandidateRowLimitExceeded =
        new("candidate_row_limit_exceeded", "The statement exceeds the 1,000 transaction-row limit.");
}

public sealed record SunflowerStatementParseResult(
    IReadOnlyList<NormalizedImportedRow> Rows,
    SunflowerStatementParseFailure? Failure)
{
    public bool IsSuccess => Failure is null;

    public static SunflowerStatementParseResult Success(IReadOnlyList<NormalizedImportedRow> rows) =>
        new(rows, null);

    public static SunflowerStatementParseResult Failed(SunflowerStatementParseFailure failure) =>
        new(Array.Empty<NormalizedImportedRow>(), failure);
}
