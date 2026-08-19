using System.Buffers.Binary;
using System.Text;
using BudgetPlanner.PdfWorker;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Exceptions;

return await RunAsync();

static async Task<int> RunAsync()
{
    try
    {
        var availableMemory = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
        if (availableMemory <= 0 || availableMemory > 128L * 1024 * 1024)
        {
            return 1;
        }

        var input = Console.OpenStandardInput();
        var output = Console.OpenStandardOutput();
        var header = new byte[9];
        if (!await ReadExactlyAsync(input, header) ||
            !header.AsSpan(0, 4).SequenceEqual(PdfWorkerProtocol.RequestMagic) ||
            header[4] != PdfWorkerProtocol.Version)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.ProtocolError);
            return 0;
        }

        var length = BinaryPrimitives.ReadUInt32LittleEndian(header.AsSpan(5));
        if (length == 0 || length > PdfWorkerProtocol.MaxInputBytes)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output,
                length > PdfWorkerProtocol.MaxInputBytes ? WorkerResultKind.InputTooLarge : WorkerResultKind.ProtocolError);
            return 0;
        }

        var pdf = GC.AllocateUninitializedArray<byte>((int)length);
        if (!await ReadExactlyAsync(input, pdf) || input.ReadByte() != -1)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.ProtocolError);
            return 0;
        }

        return await ExtractAsync(pdf, output);
    }
    catch (OutOfMemoryException)
    {
        try { await PdfWorkerProtocol.WriteFailureAsync(Console.OpenStandardOutput(), WorkerResultKind.ProcessingFailed); } catch { }
        return 0;
    }
    catch
    {
        return 1;
    }
}

static async Task<int> ExtractAsync(byte[] pdf, Stream output)
{
    try
    {
        var options = new ParsingOptions
        {
            UseLenientParsing = false,
            MaxStackDepth = 100
        };

        using var document = PdfDocument.Open(pdf, options);
        if (document.IsEncrypted)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.EncryptedPdf);
            return 0;
        }

        if (document.NumberOfPages <= 0)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.InvalidPdf);
            return 0;
        }

        if (document.NumberOfPages > PdfWorkerProtocol.MaxPages)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.PageLimitExceeded);
            return 0;
        }

        var pages = new List<string>(document.NumberOfPages);
        var characters = 0;
        var utf8Bytes = 0;
        var hasText = false;
        var utf8 = new UTF8Encoding(false, true);
        for (var pageNumber = 1; pageNumber <= document.NumberOfPages; pageNumber++)
        {
            var text = document.GetPage(pageNumber).Text;
            var nextCharacters = checked(characters + text.Length);
            var nextUtf8Bytes = checked(utf8Bytes + utf8.GetByteCount(text));
            if (nextCharacters > PdfWorkerProtocol.MaxCharacters || nextUtf8Bytes > PdfWorkerProtocol.MaxUtf8Bytes)
            {
                await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.TextLimitExceeded);
                return 0;
            }

            characters = nextCharacters;
            utf8Bytes = nextUtf8Bytes;
            hasText |= !string.IsNullOrWhiteSpace(text);
            pages.Add(text);
        }

        if (!hasText)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.NoExtractableText);
            return 0;
        }

        await PdfWorkerProtocol.WriteSuccessAsync(output, pdf.Length, pages);
        return 0;
    }
    catch (PdfDocumentEncryptedException)
    {
        await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.EncryptedPdf);
        return 0;
    }
    catch (PdfDocumentFormatException)
    {
        await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.InvalidPdf);
        return 0;
    }
    catch (InvalidOperationException)
    {
        await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.InvalidPdf);
        return 0;
    }
}

static async Task<bool> ReadExactlyAsync(Stream input, Memory<byte> buffer)
{
    var read = 0;
    while (read < buffer.Length)
    {
        var count = await input.ReadAsync(buffer[read..]);
        if (count == 0) return false;
        read += count;
    }
    return true;
}
