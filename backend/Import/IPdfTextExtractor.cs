namespace BudgetPlanner.Import;

public interface IPdfTextExtractor
{
    Task<PdfTextExtractionOutcome> ExtractAsync(ReadOnlyMemory<byte> pdf, CancellationToken cancellationToken = default);
}
