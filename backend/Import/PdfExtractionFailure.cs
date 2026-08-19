namespace BudgetPlanner.Import;

public sealed record PdfExtractionFailure(string Code, string Message)
{
    public static readonly PdfExtractionFailure InvalidPdf = new("invalid_pdf", "The PDF is invalid or unsupported.");
    public static readonly PdfExtractionFailure EncryptedPdf = new("encrypted_pdf", "Encrypted PDFs are not supported.");
    public static readonly PdfExtractionFailure NoExtractableText = new("no_extractable_text", "The PDF does not contain extractable text.");
    public static readonly PdfExtractionFailure InputTooLarge = new("input_too_large", "The PDF exceeds the 10 MiB limit.");
    public static readonly PdfExtractionFailure PageLimitExceeded = new("page_limit_exceeded", "The PDF exceeds the 25-page limit.");
    public static readonly PdfExtractionFailure TextLimitExceeded = new("text_limit_exceeded", "The PDF exceeds the extracted-text limit.");
    public static readonly PdfExtractionFailure Cancelled = new("cancelled", "PDF extraction was cancelled.");
    public static readonly PdfExtractionFailure TimedOut = new("timed_out", "PDF extraction timed out.");
    public static readonly PdfExtractionFailure ProcessingFailed = new("processing_failed", "The PDF could not be processed safely.");
}
