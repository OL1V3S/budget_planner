namespace BudgetPlanner.Import;

public sealed record PdfExtractedPage(int PageNumber, string Text);

public sealed record PdfTextExtractionResult(
    int ByteCount,
    int PageCount,
    int CharacterCount,
    IReadOnlyList<PdfExtractedPage> Pages);

public sealed record PdfTextExtractionOutcome(
    PdfTextExtractionResult? Result,
    PdfExtractionFailure? Failure)
{
    public bool IsSuccess => Result is not null && Failure is null;
    public static PdfTextExtractionOutcome Success(PdfTextExtractionResult result) => new(result, null);
    public static PdfTextExtractionOutcome Failed(PdfExtractionFailure failure) => new(null, failure);
}
