namespace BudgetPlanner.Import;

public sealed class PdfExtractionOptions
{
    public static readonly TimeSpan MaximumTimeout = TimeSpan.FromSeconds(10);
    public TimeSpan Timeout { get; init; } = MaximumTimeout;
}
