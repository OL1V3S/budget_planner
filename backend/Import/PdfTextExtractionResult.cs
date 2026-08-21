namespace BudgetPlanner.Import;

public enum PdfWordOrientation : byte
{
    Horizontal = 0,
    Rotate180 = 1,
    Rotate90 = 2,
    Rotate270 = 3,
    Other = 4
}

public sealed record PdfExtractedWord(
    int Ordinal,
    string Text,
    double Left,
    double Bottom,
    double Right,
    double Top,
    double Baseline,
    PdfWordOrientation Orientation);

public sealed record PdfExtractedPage(
    int PageNumber,
    string Text,
    IReadOnlyList<PdfExtractedWord> Words)
{
    public PdfExtractedPage(int pageNumber, string text)
        : this(pageNumber, text, Array.Empty<PdfExtractedWord>()) { }
}

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
