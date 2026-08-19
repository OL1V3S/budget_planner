using System.Buffers.Binary;
using System.ComponentModel;
using System.Diagnostics;
using System.Text;

namespace BudgetPlanner.Import;

public sealed class ContainedPdfTextExtractor : IPdfTextExtractor
{
    private const string HeapLimitHex = "8000000";
    private static readonly SemaphoreSlim WorkerPermit = new(1, 1);
    private readonly PdfExtractionOptions options;
    private readonly Func<ProcessStartInfo> startInfoFactory;
    private readonly Action<int>? processStarted;

    public ContainedPdfTextExtractor(PdfExtractionOptions? options = null)
        : this(options, null, null) { }

    internal ContainedPdfTextExtractor(
        PdfExtractionOptions? options,
        Func<ProcessStartInfo>? startInfoFactory,
        Action<int>? processStarted)
    {
        this.options = options ?? new PdfExtractionOptions();
        if (this.options.Timeout < TimeSpan.Zero || this.options.Timeout > PdfExtractionOptions.MaximumTimeout)
        {
            throw new ArgumentOutOfRangeException(nameof(options), "Timeout must be between zero and 10 seconds.");
        }

        this.startInfoFactory = startInfoFactory ?? CreateProductionStartInfo;
        this.processStarted = processStarted;
    }

    public async Task<PdfTextExtractionOutcome> ExtractAsync(
        ReadOnlyMemory<byte> pdf,
        CancellationToken cancellationToken = default)
    {
        if (pdf.Length > PdfWorkerProtocol.MaxInputBytes)
        {
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.InputTooLarge);
        }

        if (pdf.IsEmpty)
        {
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.InvalidPdf);
        }

        if (cancellationToken.IsCancellationRequested)
        {
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.Cancelled);
        }

        try
        {
            await WorkerPermit.WaitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.Cancelled);
        }

        try
        {
            return await RunWorkerAsync(pdf, cancellationToken);
        }
        finally
        {
            WorkerPermit.Release();
        }
    }

    private async Task<PdfTextExtractionOutcome> RunWorkerAsync(
        ReadOnlyMemory<byte> pdf,
        CancellationToken callerToken)
    {
        using var timeout = new CancellationTokenSource(options.Timeout);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(callerToken, timeout.Token);
        using var process = new Process { StartInfo = startInfoFactory(), EnableRaisingEvents = true };

        try
        {
            if (!process.Start()) return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
            processStarted?.Invoke(process.Id);

            var writeTask = WriteRequestAsync(process.StandardInput.BaseStream, pdf, linked.Token);
            var outputTask = ReadBoundedAsync(process.StandardOutput.BaseStream, PdfWorkerProtocol.MaxResponseBytes, linked.Token);
            var errorTask = ReadBoundedAsync(process.StandardError.BaseStream, PdfWorkerProtocol.MaxErrorBytes, linked.Token);
            var exitTask = process.WaitForExitAsync(linked.Token);

            try
            {
                await Task.WhenAll(writeTask, outputTask, errorTask, exitTask);
            }
            catch (OperationCanceledException)
            {
                await TerminateAndReapAsync(process);
                return PdfTextExtractionOutcome.Failed(
                    callerToken.IsCancellationRequested ? PdfExtractionFailure.Cancelled : PdfExtractionFailure.TimedOut);
            }
            catch
            {
                await TerminateAndReapAsync(process);
                return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
            }

            if (callerToken.IsCancellationRequested)
            {
                await TerminateAndReapAsync(process);
                return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.Cancelled);
            }

            if (timeout.IsCancellationRequested || process.ExitCode != 0)
            {
                await TerminateAndReapAsync(process);
                return PdfTextExtractionOutcome.Failed(
                    timeout.IsCancellationRequested ? PdfExtractionFailure.TimedOut : PdfExtractionFailure.ProcessingFailed);
            }

            return ParseResponse(outputTask.Result, pdf.Length);
        }
        catch (Win32Exception)
        {
            await TerminateAndReapAsync(process);
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
        }
        finally
        {
            try
            {
                if (!process.HasExited) await TerminateAndReapAsync(process);
            }
            catch (InvalidOperationException) { }
        }
    }

    internal static ProcessStartInfo CreateProductionStartInfo()
    {
        var executableName = OperatingSystem.IsWindows() ? "backend.PdfWorker.exe" : "backend.PdfWorker";
        var baseDirectory = Path.GetFullPath(AppContext.BaseDirectory);
        var workerDirectory = Path.GetFullPath(Path.Combine(baseDirectory, "PdfWorker"));
        var executable = Path.GetFullPath(Path.Combine(workerDirectory, executableName));
        if (!executable.StartsWith(workerDirectory + Path.DirectorySeparatorChar, StringComparison.Ordinal) ||
            !File.Exists(executable))
        {
            throw new InvalidOperationException("The contained PDF worker is unavailable.");
        }

        var info = new ProcessStartInfo
        {
            FileName = executable,
            WorkingDirectory = baseDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        var gcKeys = info.Environment.Keys
            .Where(key => key.StartsWith("DOTNET_GCHeapHardLimit", StringComparison.OrdinalIgnoreCase) ||
                          key.StartsWith("COMPlus_GCHeapHardLimit", StringComparison.OrdinalIgnoreCase))
            .ToArray();
        foreach (var key in gcKeys) info.Environment.Remove(key);

        var sensitiveKeys = info.Environment.Keys
            .Where(IsSensitiveEnvironmentKey)
            .ToArray();
        foreach (var key in sensitiveKeys) info.Environment.Remove(key);
        info.Environment["DOTNET_GCHeapHardLimit"] = HeapLimitHex;
        return info;
    }

    private static bool IsSensitiveEnvironmentKey(string key) =>
        key.StartsWith("BUDGETPLANNER_", StringComparison.OrdinalIgnoreCase) ||
        key.StartsWith("ConnectionStrings__", StringComparison.OrdinalIgnoreCase) ||
        key.StartsWith("Jwt__", StringComparison.OrdinalIgnoreCase) ||
        key.StartsWith("Email__", StringComparison.OrdinalIgnoreCase) ||
        key.StartsWith("Google", StringComparison.OrdinalIgnoreCase) ||
        key.StartsWith("ASPNETCORE_", StringComparison.OrdinalIgnoreCase);

    private static async Task WriteRequestAsync(Stream stream, ReadOnlyMemory<byte> pdf, CancellationToken token)
    {
        var header = new byte[9];
        PdfWorkerProtocol.RequestMagic.CopyTo(header);
        header[4] = PdfWorkerProtocol.Version;
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(5), (uint)pdf.Length);
        await stream.WriteAsync(header, token);
        await stream.WriteAsync(pdf, token);
        await stream.FlushAsync(token);
        stream.Close();
    }

    private static async Task<byte[]> ReadBoundedAsync(Stream stream, int limit, CancellationToken token)
    {
        using var output = new MemoryStream(Math.Min(limit, 8192));
        var buffer = new byte[8192];
        while (true)
        {
            var read = await stream.ReadAsync(buffer, token);
            if (read == 0) return output.ToArray();
            if (output.Length + read > limit) throw new InvalidDataException("Worker output exceeded its limit.");
            output.Write(buffer, 0, read);
        }
    }

    private static PdfTextExtractionOutcome ParseResponse(byte[] response, int expectedInputBytes)
    {
        if (response.Length < 6 || !response.AsSpan(0, 4).SequenceEqual(PdfWorkerProtocol.ResponseMagic) ||
            response[4] != PdfWorkerProtocol.Version)
        {
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
        }

        var kind = (WorkerResultKind)response[5];
        if (kind != WorkerResultKind.Success)
        {
            if (response.Length != 6) return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
            return PdfTextExtractionOutcome.Failed(kind switch
            {
                WorkerResultKind.InvalidPdf => PdfExtractionFailure.InvalidPdf,
                WorkerResultKind.EncryptedPdf => PdfExtractionFailure.EncryptedPdf,
                WorkerResultKind.NoExtractableText => PdfExtractionFailure.NoExtractableText,
                WorkerResultKind.PageLimitExceeded => PdfExtractionFailure.PageLimitExceeded,
                WorkerResultKind.TextLimitExceeded => PdfExtractionFailure.TextLimitExceeded,
                WorkerResultKind.ProcessingFailed => PdfExtractionFailure.ProcessingFailed,
                _ => PdfExtractionFailure.ProcessingFailed
            });
        }

        try
        {
            var offset = 6;
            var byteCount = ReadInt32(response, ref offset);
            var pageCount = ReadInt32(response, ref offset);
            var characterCount = ReadInt32(response, ref offset);
            if (byteCount != expectedInputBytes || pageCount is <= 0 or > PdfWorkerProtocol.MaxPages ||
                characterCount is < 0 or > PdfWorkerProtocol.MaxCharacters)
                throw new InvalidDataException();

            var decoder = new UTF8Encoding(false, true);
            var pages = new List<PdfExtractedPage>(pageCount);
            var actualCharacters = 0;
            var actualUtf8Bytes = 0;
            for (var index = 0; index < pageCount; index++)
            {
                var pageNumber = ReadInt32(response, ref offset);
                var textLength = ReadInt32(response, ref offset);
                if (pageNumber != index + 1 || textLength < 0 || offset + textLength > response.Length)
                    throw new InvalidDataException();
                var text = decoder.GetString(response, offset, textLength);
                offset += textLength;
                actualCharacters = checked(actualCharacters + text.Length);
                actualUtf8Bytes = checked(actualUtf8Bytes + textLength);
                pages.Add(new PdfExtractedPage(pageNumber, text));
            }

            if (offset != response.Length || actualCharacters != characterCount || actualUtf8Bytes > PdfWorkerProtocol.MaxUtf8Bytes)
                throw new InvalidDataException();
            return PdfTextExtractionOutcome.Success(new(byteCount, pageCount, characterCount, pages));
        }
        catch
        {
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
        }
    }

    private static int ReadInt32(byte[] bytes, ref int offset)
    {
        if (offset + 4 > bytes.Length) throw new InvalidDataException();
        var value = BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan(offset, 4));
        offset += 4;
        return value;
    }

    private static async Task TerminateAndReapAsync(Process process)
    {
        try
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
        }
        catch (InvalidOperationException) { }
        catch (Win32Exception) { }

        try { await process.WaitForExitAsync(CancellationToken.None); }
        catch (InvalidOperationException) { }
    }
}
