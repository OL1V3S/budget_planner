using BudgetPlanner.Import;
using BudgetPlanner.Tests.Import.Fixtures.Sunflower;
using Xunit;
using Xunit.Abstractions;

namespace BudgetPlanner.Tests.Import;

public sealed class PdfTextExtractorTests
{
    private readonly ITestOutputHelper output;

    public PdfTextExtractorTests(ITestOutputHelper output) => this.output = output;

    [Fact]
    public async Task Representative_pdf_extracts_ordered_pages()
    {
        var outcome = await new ContainedPdfTextExtractor().ExtractAsync(SunflowerFixtureCorpus.CreateRepresentativePdf());

        Assert.True(outcome.IsSuccess);
        Assert.NotNull(outcome.Result);
        Assert.Equal(4, outcome.Result.PageCount);
        Assert.Contains("DEMO PAYROLL CREDIT", outcome.Result.Pages[0].Text);
        Assert.Contains("Important Account Information", outcome.Result.Pages[3].Text);
    }

    [Fact]
    public async Task Oversized_input_is_rejected_before_worker_start()
    {
        var started = false;
        var extractor = new ContainedPdfTextExtractor(null, null, _ => started = true);
        var outcome = await extractor.ExtractAsync(new byte[(10 * 1024 * 1024) + 1]);
        Assert.Equal("input_too_large", outcome.Failure?.Code);
        Assert.False(started);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("image")]
    [InlineData("encrypted")]
    public async Task Unsafe_or_unsupported_pdf_fails_closed(string kind)
    {
        var pdf = kind switch
        {
            "invalid" => ParserSpecificPdfFixtures.InvalidPdf(),
            "image" => ParserSpecificPdfFixtures.ImageOnlyPdf(),
            _ => ParserSpecificPdfFixtures.EncryptedPdf()
        };
        var outcome = await new ContainedPdfTextExtractor().ExtractAsync(pdf);
        var expected = kind switch
        {
            "invalid" => "invalid_pdf",
            "image" => "no_extractable_text",
            _ => "encrypted_pdf"
        };
        Assert.Equal(expected, outcome.Failure?.Code);
    }

    [Fact]
    public async Task Page_limit_is_enforced_before_text_result()
    {
        var outcome = await new ContainedPdfTextExtractor().ExtractAsync(ParserSpecificPdfFixtures.PageCountPdf(26));
        Assert.Equal("page_limit_exceeded", outcome.Failure?.Code);
    }

    [Fact]
    public async Task Extracted_text_limit_is_enforced()
    {
        var outcome = await new ContainedPdfTextExtractor().ExtractAsync(
            ParserSpecificPdfFixtures.TextVolumePdf(2_000_001));
        Assert.Equal("text_limit_exceeded", outcome.Failure?.Code);
    }

    [Fact]
    public async Task Active_content_is_inert_while_page_text_is_extracted()
    {
        var outcome = await new ContainedPdfTextExtractor().ExtractAsync(ParserSpecificPdfFixtures.ActiveContentPdf());
        Assert.True(outcome.IsSuccess);
        Assert.Contains("SAFE SYNTHETIC TEXT", outcome.Result!.Pages.Single().Text);
    }

    [Fact]
    public async Task Flate_compressed_text_uses_real_parser_path()
    {
        var outcome = await new ContainedPdfTextExtractor().ExtractAsync(
            ParserSpecificPdfFixtures.CompressedTextPdf(10));
        Assert.True(outcome.IsSuccess);
        Assert.Equal(10, outcome.Result!.CharacterCount);
    }

    [Fact]
    public async Task Real_worker_compressed_memory_pressure_fails_closed_and_recovers()
    {
        var pressurePdf = ParserSpecificPdfFixtures.CompressedTextPdf(1_000_000);
        Assert.True(pressurePdf.Length < 10 * 1024 * 1024);

        for (var iteration = 0; iteration < 2; iteration++)
        {
            int? pid = null;
            var extractor = new ContainedPdfTextExtractor(
                null,
                () =>
                {
                    var info = ContainedPdfTextExtractor.CreateProductionStartInfo();
                    info.Environment["DOTNET_GCHeapHardLimit"] = "2000000";
                    return info;
                },
                value => pid = value);

            var outcome = await extractor.ExtractAsync(pressurePdf);

            Assert.Equal("processing_failed", outcome.Failure?.Code);
            Assert.NotNull(pid);
            Assert.Throws<ArgumentException>(() => System.Diagnostics.Process.GetProcessById(pid!.Value));
        }

        var healthy = await new ContainedPdfTextExtractor().ExtractAsync(
            SunflowerFixtureCorpus.CreateRepresentativePdf());
        Assert.True(healthy.IsSuccess);
    }

    [Fact]
    public async Task Valid_boundary_fixtures_record_sanitized_memory_envelope()
    {
        var fixtures = new (string Name, byte[] Pdf)[]
        {
            ("representative-four-page", SunflowerFixtureCorpus.CreateRepresentativePdf()),
            ("twenty-five-page", ParserSpecificPdfFixtures.PageCountPdf(25)),
            ("two-million-character", ParserSpecificPdfFixtures.TextVolumePdf(2_000_000))
        };

        foreach (var fixture in fixtures)
        {
            PdfProcessObservation? observation = null;
            var extractor = new ContainedPdfTextExtractor(
                null,
                () =>
                {
                    var info = ContainedPdfTextExtractor.CreateProductionStartInfo();
                    info.Environment["BUDGETPLANNER_PDF_WORKER_TEST_METRICS"] = "1";
                    return info;
                },
                null,
                value => observation = value);

            var outcome = await extractor.ExtractAsync(fixture.Pdf);

            Assert.True(outcome.IsSuccess);
            Assert.NotNull(observation);
            Assert.Equal(128L * 1024 * 1024, observation.Value.StartupTotalAvailableBytes);
            Assert.InRange(observation.Value.MaxTotalCommittedBytes, 1, 128L * 1024 * 1024);
            Assert.InRange(observation.Value.MaxHeapSizeBytes, 1, 128L * 1024 * 1024);
            Assert.InRange(observation.Value.PostCollectionLiveBytes, 1, 128L * 1024 * 1024);
            Assert.True(observation.Value.PeakWorkingSetBytes > 0);
            output.WriteLine(
                "{0}: available={1}, committed={2}, heap={3}, live-no-gc={4}, cumulative={5}, live-post-gc={6}, working-set={7} bytes",
                fixture.Name,
                observation.Value.StartupTotalAvailableBytes,
                observation.Value.MaxTotalCommittedBytes,
                observation.Value.MaxHeapSizeBytes,
                observation.Value.MaxLiveBytes,
                observation.Value.MaxCumulativeAllocatedBytes,
                observation.Value.PostCollectionLiveBytes,
                observation.Value.PeakWorkingSetBytes);
        }
    }

    [Fact]
    public async Task Pre_cancelled_call_starts_no_worker()
    {
        var started = false;
        var extractor = new ContainedPdfTextExtractor(null, null, _ => started = true);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var outcome = await extractor.ExtractAsync(SunflowerFixtureCorpus.CreateRepresentativePdf(), cancellation.Token);
        Assert.Equal("cancelled", outcome.Failure?.Code);
        Assert.False(started);
    }

    [Fact]
    public async Task Worker_start_info_failure_returns_safe_failure_and_releases_permit()
    {
        var extractor = new ContainedPdfTextExtractor(
            null,
            () => throw new InvalidOperationException("Synthetic missing worker."),
            null);

        var outcome = await extractor.ExtractAsync(SunflowerFixtureCorpus.CreateRepresentativePdf());

        Assert.Equal("processing_failed", outcome.Failure?.Code);
        var healthy = await new ContainedPdfTextExtractor().ExtractAsync(
            SunflowerFixtureCorpus.CreateRepresentativePdf());
        Assert.True(healthy.IsSuccess);
    }

    [Fact]
    public async Task Zero_timeout_terminates_real_worker()
    {
        int? pid = null;
        var extractor = new ContainedPdfTextExtractor(
            new PdfExtractionOptions { Timeout = TimeSpan.Zero }, null, value => pid = value);
        var outcome = await extractor.ExtractAsync(SunflowerFixtureCorpus.CreateRepresentativePdf());
        Assert.Equal("timed_out", outcome.Failure?.Code);
        if (pid is not null) Assert.Throws<ArgumentException>(() => System.Diagnostics.Process.GetProcessById(pid.Value));
    }

    [Fact]
    public async Task Unconfirmed_termination_maps_to_processing_failed_after_real_reap()
    {
        int? pid = null;
        var extractor = new ContainedPdfTextExtractor(
            new PdfExtractionOptions { Timeout = TimeSpan.Zero },
            null,
            value => pid = value,
            null,
            async process =>
            {
                Assert.True(await ContainedPdfTextExtractor.TerminateAndReapAsync(process));
                return false;
            });

        var outcome = await extractor.ExtractAsync(SunflowerFixtureCorpus.CreateRepresentativePdf());

        Assert.Equal("processing_failed", outcome.Failure?.Code);
        Assert.NotNull(pid);
        Assert.Throws<ArgumentException>(() => System.Diagnostics.Process.GetProcessById(pid!.Value));
    }

    [Fact]
    public async Task Reaping_an_unstarted_process_fails_closed_without_blocking()
    {
        using var process = new System.Diagnostics.Process();
        var startedAt = System.Diagnostics.Stopwatch.StartNew();

        var reaped = await ContainedPdfTextExtractor.TerminateAndReapAsync(process);

        Assert.False(reaped);
        Assert.True(startedAt.Elapsed < TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Post_start_cancellation_terminates_real_worker()
    {
        using var cancellation = new CancellationTokenSource();
        int? pid = null;
        var extractor = new ContainedPdfTextExtractor(null, null, value =>
        {
            pid = value;
            cancellation.Cancel();
        });

        var outcome = await extractor.ExtractAsync(
            ParserSpecificPdfFixtures.TextVolumePdf(500_000), cancellation.Token);

        Assert.Equal("cancelled", outcome.Failure?.Code);
        Assert.NotNull(pid);
        Assert.Throws<ArgumentException>(() => System.Diagnostics.Process.GetProcessById(pid!.Value));
    }

    [Fact]
    public void Timeout_cannot_exceed_production_maximum()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new ContainedPdfTextExtractor(new PdfExtractionOptions { Timeout = TimeSpan.FromSeconds(11) }, null, null));
    }

    [Fact]
    public void Production_start_overwrites_inherited_gc_limits_and_scrubs_secrets()
    {
        var priorDotnet = Environment.GetEnvironmentVariable("DOTNET_GCHeapHardLimitPercent");
        var priorComPlus = Environment.GetEnvironmentVariable("COMPlus_GCHeapHardLimitLOH");
        var priorSecret = Environment.GetEnvironmentVariable("BUDGETPLANNER_TEST_SECRET");
        try
        {
            Environment.SetEnvironmentVariable("DOTNET_GCHeapHardLimitPercent", "99");
            Environment.SetEnvironmentVariable("COMPlus_GCHeapHardLimitLOH", "FFFFFFFF");
            Environment.SetEnvironmentVariable("BUDGETPLANNER_TEST_SECRET", "must-not-reach-worker");

            var info = ContainedPdfTextExtractor.CreateProductionStartInfo();

            Assert.Equal("8000000", info.Environment["DOTNET_GCHeapHardLimit"]);
            Assert.DoesNotContain(info.Environment.Keys, key =>
                !key.Equals("DOTNET_GCHeapHardLimit", StringComparison.OrdinalIgnoreCase) &&
                (key.StartsWith("DOTNET_GCHeapHardLimit", StringComparison.OrdinalIgnoreCase) ||
                 key.StartsWith("COMPlus_GCHeapHardLimit", StringComparison.OrdinalIgnoreCase)));
            Assert.False(info.Environment.ContainsKey("BUDGETPLANNER_TEST_SECRET"));
            Assert.False(info.UseShellExecute);
            Assert.Empty(info.ArgumentList);
        }
        finally
        {
            Environment.SetEnvironmentVariable("DOTNET_GCHeapHardLimitPercent", priorDotnet);
            Environment.SetEnvironmentVariable("COMPlus_GCHeapHardLimitLOH", priorComPlus);
            Environment.SetEnvironmentVariable("BUDGETPLANNER_TEST_SECRET", priorSecret);
        }
    }

}
