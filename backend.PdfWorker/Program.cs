using System.Buffers.Binary;
using System.Text;
using BudgetPlanner.PdfWorker;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
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
    var metricsEnabled = TestMetricsEnabled();
    var startupAvailableBytes = metricsEnabled ? GC.GetGCMemoryInfo().TotalAvailableMemoryBytes : 0;
    long maxCommittedBytes = 0;
    long maxHeapSizeBytes = 0;
    long maxLiveBytes = 0;
    long maxCumulativeAllocatedBytes = 0;
    long postCollectionLiveBytes = 0;
    if (metricsEnabled) ObserveGc();
    try
    {
        var options = new ParsingOptions
        {
            UseLenientParsing = false,
            MaxStackDepth = 100
        };

        using var document = PdfDocument.Open(pdf, options);
        if (metricsEnabled) ObserveGc();
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

        var pages = new List<WorkerExtractedPage>(document.NumberOfPages);
        var characters = 0;
        var utf8Bytes = 0;
        var layoutWords = 0;
        var layoutCharacters = 0;
        var layoutUtf8Bytes = 0;
        var responseBytes = 6 + (3 * sizeof(int));
        var hasText = false;
        var utf8 = new UTF8Encoding(false, true);
        for (var pageNumber = 1; pageNumber <= document.NumberOfPages; pageNumber++)
        {
            var page = document.GetPage(pageNumber);
            var text = page.Text;
            if (metricsEnabled) ObserveGc();
            var nextCharacters = checked(characters + text.Length);
            var pageUtf8Bytes = utf8.GetByteCount(text);
            var nextUtf8Bytes = checked(utf8Bytes + pageUtf8Bytes);
            if (nextCharacters > PdfWorkerProtocol.MaxCharacters || nextUtf8Bytes > PdfWorkerProtocol.MaxUtf8Bytes)
            {
                await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.TextLimitExceeded);
                return 0;
            }

            var words = new List<WorkerExtractedWord>();
            var pageLayoutCharacters = 0;
            var pageLayoutUtf8Bytes = 0;
            var pageLayoutResponseBytes = 0;
            var layoutAvailable = true;
            foreach (var word in page.GetWords())
            {
                var wordUtf8Bytes = utf8.GetByteCount(word.Text);
                pageLayoutCharacters = checked(pageLayoutCharacters + word.Text.Length);
                pageLayoutUtf8Bytes = checked(pageLayoutUtf8Bytes + wordUtf8Bytes);
                pageLayoutResponseBytes = checked(pageLayoutResponseBytes + 29 + wordUtf8Bytes);
                if (layoutWords + words.Count + 1 > PdfWorkerProtocol.MaxLayoutWords
                    || layoutCharacters + pageLayoutCharacters > PdfWorkerProtocol.MaxLayoutCharacters
                    || layoutUtf8Bytes + pageLayoutUtf8Bytes > PdfWorkerProtocol.MaxLayoutUtf8Bytes
                    || responseBytes + 12 + pageUtf8Bytes + pageLayoutResponseBytes > PdfWorkerProtocol.MaxResponseBytes
                    || !TryCreateWord(page, word, words.Count + 1, out var extractedWord))
                {
                    words.Clear();
                    layoutAvailable = false;
                    break;
                }

                words.Add(extractedWord!);
            }

            characters = nextCharacters;
            utf8Bytes = nextUtf8Bytes;
            hasText |= !string.IsNullOrWhiteSpace(text);
            responseBytes = checked(responseBytes + 12 + pageUtf8Bytes);
            if (layoutAvailable)
            {
                layoutWords = checked(layoutWords + words.Count);
                layoutCharacters = checked(layoutCharacters + pageLayoutCharacters);
                layoutUtf8Bytes = checked(layoutUtf8Bytes + pageLayoutUtf8Bytes);
                responseBytes = checked(responseBytes + pageLayoutResponseBytes);
            }
            if (responseBytes > PdfWorkerProtocol.MaxResponseBytes)
            {
                await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.TextLimitExceeded);
                return 0;
            }
            pages.Add(new WorkerExtractedPage(pageNumber, text, words));
        }

        if (!hasText)
        {
            await PdfWorkerProtocol.WriteFailureAsync(output, WorkerResultKind.NoExtractableText);
            return 0;
        }

        await PdfWorkerProtocol.WriteSuccessAsync(output, pdf.Length, pages);
        if (metricsEnabled)
        {
            postCollectionLiveBytes = GC.GetTotalMemory(true);
            ObserveGc();
            WriteTestMetric(
                startupAvailableBytes,
                maxCommittedBytes,
                maxHeapSizeBytes,
                maxLiveBytes,
                maxCumulativeAllocatedBytes,
                postCollectionLiveBytes);
        }
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

    void ObserveGc()
    {
        var info = GC.GetGCMemoryInfo();
        maxCommittedBytes = Math.Max(maxCommittedBytes, info.TotalCommittedBytes);
        maxHeapSizeBytes = Math.Max(maxHeapSizeBytes, info.HeapSizeBytes);
        maxLiveBytes = Math.Max(maxLiveBytes, GC.GetTotalMemory(false));
        maxCumulativeAllocatedBytes = Math.Max(maxCumulativeAllocatedBytes, GC.GetTotalAllocatedBytes(false));
    }
}

static bool TryCreateWord(Page page, Word word, int ordinal, out WorkerExtractedWord? result)
{
    result = null;
    var visibleBounds = page.CropBox.GetVisibleBounds(page.Rotation);
    var visiblePoints = new[]
    {
        visibleBounds.BottomLeft,
        visibleBounds.BottomRight,
        visibleBounds.TopLeft,
        visibleBounds.TopRight
    };
    var visibleLeft = visiblePoints.Min(point => point.X);
    var visibleBottom = visiblePoints.Min(point => point.Y);
    var visibleWidth = visiblePoints.Max(point => point.X) - visibleLeft;
    var visibleHeight = visiblePoints.Max(point => point.Y) - visibleBottom;
    if (string.IsNullOrEmpty(word.Text) || word.Letters.Count == 0
        || visibleWidth <= 0 || visibleHeight <= 0
        || !double.IsFinite(visibleWidth) || !double.IsFinite(visibleHeight))
    {
        return false;
    }

    var rectangle = word.BoundingBox;
    var points = new[] { rectangle.BottomLeft, rectangle.BottomRight, rectangle.TopLeft, rectangle.TopRight };
    var left = (points.Min(point => point.X) - visibleLeft) / visibleWidth;
    var right = (points.Max(point => point.X) - visibleLeft) / visibleWidth;
    var bottom = (points.Min(point => point.Y) - visibleBottom) / visibleHeight;
    var top = (points.Max(point => point.Y) - visibleBottom) / visibleHeight;
    var baseline = (word.Letters.Average(letter => letter.StartBaseLine.Y) - visibleBottom) / visibleHeight;
    if (!TryEncodeCoordinate(left, out var encodedLeft)
        || !TryEncodeCoordinate(bottom, out var encodedBottom)
        || !TryEncodeCoordinate(right, out var encodedRight)
        || !TryEncodeCoordinate(top, out var encodedTop)
        || !TryEncodeCoordinate(baseline, out var encodedBaseline)
        || encodedLeft > encodedRight
        || encodedBottom > encodedTop)
    {
        return false;
    }

    var orientation = word.TextOrientation switch
    {
        TextOrientation.Horizontal => (byte)0,
        TextOrientation.Rotate180 => (byte)1,
        TextOrientation.Rotate90 => (byte)2,
        TextOrientation.Rotate270 => (byte)3,
        TextOrientation.Other => (byte)4,
        _ => byte.MaxValue
    };
    if (orientation == byte.MaxValue)
    {
        return false;
    }

    result = new WorkerExtractedWord(
        ordinal,
        word.Text,
        encodedLeft,
        encodedBottom,
        encodedRight,
        encodedTop,
        encodedBaseline,
        orientation);
    return true;
}

static bool TryEncodeCoordinate(double value, out int encoded)
{
    encoded = 0;
    if (!double.IsFinite(value))
    {
        return false;
    }

    var scaled = Math.Round(value * PdfWorkerProtocol.CoordinateScale, MidpointRounding.AwayFromZero);
    if (scaled < PdfWorkerProtocol.MinNormalizedCoordinate || scaled > PdfWorkerProtocol.MaxNormalizedCoordinate)
    {
        return false;
    }

    encoded = checked((int)scaled);
    return true;
}

static void WriteTestMetric(
    long startupAvailableBytes,
    long maxCommittedBytes,
    long maxHeapSizeBytes,
    long maxLiveBytes,
    long maxCumulativeAllocatedBytes,
    long postCollectionLiveBytes)
{
    if (TestMetricsEnabled())
    {
        Console.Error.Write(
            $"BPDFMETRIC {startupAvailableBytes} {maxCommittedBytes} {maxHeapSizeBytes} {maxLiveBytes} {maxCumulativeAllocatedBytes} {postCollectionLiveBytes}");
    }
}

static bool TestMetricsEnabled() =>
    Environment.GetEnvironmentVariable("BUDGETPLANNER_PDF_WORKER_TEST_METRICS") == "1";

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
