using System.Buffers.Binary;
using System.ComponentModel;
using System.Diagnostics;
using System.Text;

namespace BudgetPlanner.Import;

public sealed class ContainedPdfTextExtractor : IPdfTextExtractor
{
    private const string HeapLimitHex = "8000000";
    private static readonly TimeSpan ReapTimeout = TimeSpan.FromSeconds(2);
    private static readonly SemaphoreSlim WorkerPermit = new(1, 1);
    private readonly PdfExtractionOptions options;
    private readonly Func<ProcessStartInfo> startInfoFactory;
    private readonly Action<int>? processStarted;
    private readonly Action<PdfProcessObservation>? processObserved;
    private readonly Func<Process, Task<bool>> terminateAndReap;

    public ContainedPdfTextExtractor(PdfExtractionOptions? options = null)
        : this(options, null, null, null, null) { }

    internal ContainedPdfTextExtractor(
        PdfExtractionOptions? options,
        Func<ProcessStartInfo>? startInfoFactory,
        Action<int>? processStarted,
        Action<PdfProcessObservation>? processObserved = null,
        Func<Process, Task<bool>>? terminateAndReap = null)
    {
        this.options = options ?? new PdfExtractionOptions();
        if (this.options.Timeout < TimeSpan.Zero || this.options.Timeout > PdfExtractionOptions.MaximumTimeout)
        {
            throw new ArgumentOutOfRangeException(nameof(options), "Timeout must be between zero and 10 seconds.");
        }

        this.startInfoFactory = startInfoFactory ?? CreateProductionStartInfo;
        this.processStarted = processStarted;
        this.processObserved = processObserved;
        this.terminateAndReap = terminateAndReap ?? TerminateAndReapAsync;
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
        Process? process = null;

        try
        {
            process = new Process { StartInfo = startInfoFactory(), EnableRaisingEvents = true };
            if (!process.Start())
            {
                process.Dispose();
                return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
            }
        }
        catch
        {
            process?.Dispose();
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
        }

        using (process)
        {
            var terminationAttempted = false;

            async Task<bool> EnsureTerminatedAsync()
            {
                terminationAttempted = true;
                return await terminateAndReap(process);
            }

            try
            {
            processStarted?.Invoke(process.Id);

            long peakWorkingSetBytes = 0;
            using var sampling = processObserved is null ? null : new CancellationTokenSource();
            var sampleTask = sampling is null
                ? Task.CompletedTask
                : SampleWorkingSetAsync(
                    process,
                    value => peakWorkingSetBytes = Math.Max(peakWorkingSetBytes, value),
                    sampling.Token);

            var writeTask = WriteRequestAsync(process.StandardInput.BaseStream, pdf, linked.Token);
            var outputTask = ReadBoundedAsync(process.StandardOutput.BaseStream, PdfWorkerProtocol.MaxResponseBytes, linked.Token);
            var errorTask = ReadBoundedAsync(process.StandardError.BaseStream, PdfWorkerProtocol.MaxErrorBytes, linked.Token);
            var exitTask = process.WaitForExitAsync(linked.Token);

            try
            {
                await Task.WhenAll(writeTask, outputTask, errorTask, exitTask);
                sampling?.Cancel();
                await sampleTask;
            }
            catch (OperationCanceledException)
            {
                if (!await EnsureTerminatedAsync())
                    return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
                return PdfTextExtractionOutcome.Failed(
                    callerToken.IsCancellationRequested ? PdfExtractionFailure.Cancelled : PdfExtractionFailure.TimedOut);
            }
            catch
            {
                await EnsureTerminatedAsync();
                return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
            }

            if (callerToken.IsCancellationRequested)
            {
                if (!await EnsureTerminatedAsync())
                    return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
                return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.Cancelled);
            }

            if (timeout.IsCancellationRequested || process.ExitCode != 0)
            {
                if (!await EnsureTerminatedAsync())
                    return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
                return PdfTextExtractionOutcome.Failed(
                    timeout.IsCancellationRequested ? PdfExtractionFailure.TimedOut : PdfExtractionFailure.ProcessingFailed);
            }

            if (processObserved is not null && TryReadManagedMetric(errorTask.Result, peakWorkingSetBytes, out var observation))
            {
                processObserved(observation);
            }

            return ParseResponse(outputTask.Result, pdf.Length);
        }
        catch (Win32Exception)
        {
            await EnsureTerminatedAsync();
            return PdfTextExtractionOutcome.Failed(PdfExtractionFailure.ProcessingFailed);
        }
        finally
        {
            try
            {
                if (!terminationAttempted && !process.HasExited) await EnsureTerminatedAsync();
            }
            catch (InvalidOperationException) { }
        }
        }
    }

    private static async Task SampleWorkingSetAsync(Process process, Action<long> sample, CancellationToken token)
    {
        try
        {
            while (!token.IsCancellationRequested && !process.HasExited)
            {
                process.Refresh();
                sample(process.WorkingSet64);
                await Task.Delay(2, token);
            }
        }
        catch (OperationCanceledException) { }
        catch (InvalidOperationException) { }
    }

    private static bool TryReadManagedMetric(
        byte[] stderr,
        long peakWorkingSetBytes,
        out PdfProcessObservation observation)
    {
        const string prefix = "BPDFMETRIC ";
        observation = default;
        var text = Encoding.ASCII.GetString(stderr);
        if (!text.StartsWith(prefix, StringComparison.Ordinal)) return false;
        var values = text[prefix.Length..].Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (values.Length != 6 || values.Any(value => !long.TryParse(value, out _))) return false;
        var parsed = values.Select(long.Parse).ToArray();
        if (parsed.Any(value => value <= 0)) return false;
        observation = new PdfProcessObservation(
            parsed[0], parsed[1], parsed[2], parsed[3], parsed[4], parsed[5], peakWorkingSetBytes);
        return true;
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

    internal static async Task<bool> TerminateAndReapAsync(Process process)
    {
        try
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
        }
        catch (InvalidOperationException)
        {
            if (!HasExited(process)) return false;
        }
        catch (Win32Exception)
        {
            if (!HasExited(process)) return false;
        }

        try
        {
            using var reap = new CancellationTokenSource(ReapTimeout);
            await process.WaitForExitAsync(reap.Token);
            return HasExited(process);
        }
        catch (OperationCanceledException) { return false; }
        catch (InvalidOperationException) { return HasExited(process); }
    }

    private static bool HasExited(Process process)
    {
        try { return process.HasExited; }
        catch (InvalidOperationException) { return false; }
    }
}

internal readonly record struct PdfProcessObservation(
    long StartupTotalAvailableBytes,
    long MaxTotalCommittedBytes,
    long MaxHeapSizeBytes,
    long MaxLiveBytes,
    long MaxCumulativeAllocatedBytes,
    long PostCollectionLiveBytes,
    long PeakWorkingSetBytes);
