namespace BudgetPlanner.Import;

internal enum WorkerResultKind : byte
{
    Success = 0, InvalidPdf = 1, EncryptedPdf = 2, NoExtractableText = 3,
    InputTooLarge = 4, PageLimitExceeded = 5, TextLimitExceeded = 6,
    ProtocolError = 7, ProcessingFailed = 8
}

internal static class PdfWorkerProtocol
{
    public const byte Version = 1;
    public const int MaxInputBytes = 10 * 1024 * 1024;
    public const int MaxPages = 25;
    public const int MaxCharacters = 2_000_000;
    public const int MaxUtf8Bytes = 6_000_000;
    public const int MaxResponseBytes = 6_001_024;
    public const int MaxErrorBytes = 4_096;
    public static ReadOnlySpan<byte> RequestMagic => "BPDF"u8;
    public static ReadOnlySpan<byte> ResponseMagic => "BPDR"u8;
}
