using System.Buffers.Binary;
using System.Text;

namespace BudgetPlanner.PdfWorker;

internal enum WorkerResultKind : byte
{
    Success = 0,
    InvalidPdf = 1,
    EncryptedPdf = 2,
    NoExtractableText = 3,
    InputTooLarge = 4,
    PageLimitExceeded = 5,
    TextLimitExceeded = 6,
    ProtocolError = 7,
    ProcessingFailed = 8
}

internal static class PdfWorkerProtocol
{
    public const byte Version = 2;
    public const int MaxInputBytes = 10 * 1024 * 1024;
    public const int MaxPages = 25;
    public const int MaxCharacters = 2_000_000;
    public const int MaxUtf8Bytes = 6_000_000;
    public const int MaxLayoutWords = 100_000;
    public const int MaxLayoutCharacters = 2_000_000;
    public const int MaxLayoutUtf8Bytes = 6_000_000;
    public const int CoordinateScale = 1_000_000;
    public const int MinNormalizedCoordinate = -50_000;
    public const int MaxNormalizedCoordinate = 1_050_000;
    public const int MaxResponseBytes = 15 * 1024 * 1024;
    public static readonly byte[] RequestMagic = "BPDF"u8.ToArray();
    public static readonly byte[] ResponseMagic = "BPDR"u8.ToArray();

    public static async Task WriteFailureAsync(Stream output, WorkerResultKind kind)
    {
        await output.WriteAsync(ResponseMagic);
        await output.WriteAsync(new[] { Version, (byte)kind });
        await output.FlushAsync();
    }

    public static async Task WriteSuccessAsync(
        Stream output,
        int inputBytes,
        IReadOnlyList<WorkerExtractedPage> pages)
    {
        var utf8 = new UTF8Encoding(false, true);
        var encodedPages = pages.Select(page => utf8.GetBytes(page.Text)).ToArray();
        var encodedWords = pages
            .Select(page => page.Words.Select(word => utf8.GetBytes(word.Text)).ToArray())
            .ToArray();
        var characterCount = pages.Sum(page => page.Text.Length);

        await output.WriteAsync(ResponseMagic);
        await output.WriteAsync(new[] { Version, (byte)WorkerResultKind.Success });
        await WriteInt32Async(output, inputBytes);
        await WriteInt32Async(output, pages.Count);
        await WriteInt32Async(output, characterCount);
        for (var pageIndex = 0; pageIndex < pages.Count; pageIndex++)
        {
            var page = pages[pageIndex];
            await WriteInt32Async(output, page.PageNumber);
            await WriteInt32Async(output, encodedPages[pageIndex].Length);
            await output.WriteAsync(encodedPages[pageIndex]);
            await WriteInt32Async(output, page.Words.Count);
            for (var wordIndex = 0; wordIndex < page.Words.Count; wordIndex++)
            {
                var word = page.Words[wordIndex];
                await WriteInt32Async(output, word.Ordinal);
                await WriteInt32Async(output, encodedWords[pageIndex][wordIndex].Length);
                await output.WriteAsync(encodedWords[pageIndex][wordIndex]);
                await WriteInt32Async(output, word.Left);
                await WriteInt32Async(output, word.Bottom);
                await WriteInt32Async(output, word.Right);
                await WriteInt32Async(output, word.Top);
                await WriteInt32Async(output, word.Baseline);
                await output.WriteAsync(new[] { word.Orientation });
            }
        }

        await output.FlushAsync();
    }

    private static async Task WriteInt32Async(Stream output, int value)
    {
        var buffer = new byte[sizeof(int)];
        BinaryPrimitives.WriteInt32LittleEndian(buffer, value);
        await output.WriteAsync(buffer);
    }
}

internal sealed record WorkerExtractedPage(
    int PageNumber,
    string Text,
    IReadOnlyList<WorkerExtractedWord> Words);

internal sealed record WorkerExtractedWord(
    int Ordinal,
    string Text,
    int Left,
    int Bottom,
    int Right,
    int Top,
    int Baseline,
    byte Orientation);
