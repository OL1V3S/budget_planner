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
    public const byte Version = 1;
    public const int MaxInputBytes = 10 * 1024 * 1024;
    public const int MaxPages = 25;
    public const int MaxCharacters = 2_000_000;
    public const int MaxUtf8Bytes = 6_000_000;
    public static readonly byte[] RequestMagic = "BPDF"u8.ToArray();
    public static readonly byte[] ResponseMagic = "BPDR"u8.ToArray();

    public static async Task WriteFailureAsync(Stream output, WorkerResultKind kind)
    {
        await output.WriteAsync(ResponseMagic);
        await output.WriteAsync(new[] { Version, (byte)kind });
        await output.FlushAsync();
    }

    public static async Task WriteSuccessAsync(Stream output, int inputBytes, IReadOnlyList<string> pages)
    {
        var utf8 = new UTF8Encoding(false, true);
        var encoded = pages.Select(utf8.GetBytes).ToArray();
        var characterCount = pages.Sum(page => page.Length);

        await output.WriteAsync(ResponseMagic);
        await output.WriteAsync(new[] { Version, (byte)WorkerResultKind.Success });
        await WriteInt32Async(output, inputBytes);
        await WriteInt32Async(output, pages.Count);
        await WriteInt32Async(output, characterCount);
        for (var index = 0; index < encoded.Length; index++)
        {
            await WriteInt32Async(output, index + 1);
            await WriteInt32Async(output, encoded[index].Length);
            await output.WriteAsync(encoded[index]);
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
