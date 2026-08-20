using System.Globalization;
using BudgetPlanner.Import;
using BudgetPlanner.Import.Sunflower;
using BudgetPlanner.Tests.Import.Fixtures.Sunflower;
using Xunit;

namespace BudgetPlanner.Tests.Import;

public sealed class SunflowerStatementParserTests
{
    [Fact]
    public async Task Representative_pdf_flows_through_extractor_and_parser()
    {
        var extraction = await new ContainedPdfTextExtractor().ExtractAsync(
            SunflowerFixtureCorpus.CreateRepresentativePdf());

        Assert.True(extraction.IsSuccess);
        var result = new SunflowerStatementParser().Parse(extraction.Result!);

        Assert.True(result.IsSuccess, result.Failure?.Code);
        Assert.Equal(13, result.Rows.Count);
        Assert.Equal(Enumerable.Range(1, 13), result.Rows.Select(row => row.SourceRowOrdinal));

        var payroll = result.Rows[0];
        Assert.Equal(new DateOnly(2026, 2, 3), payroll.PostedDate);
        Assert.Equal(2450.00m, payroll.Amount);
        Assert.Equal(ImportedTransactionDirection.Credit, payroll.Direction);
        Assert.Equal(ImportedRowClassification.NonExpense, payroll.Classification);

        var firstDebit = result.Rows[2];
        Assert.Equal(ImportedTransactionDirection.Debit, firstDebit.Direction);
        Assert.Equal(ImportedRowClassification.ExpenseCandidate, firstDebit.Classification);
        Assert.Equal(firstDebit.SourceDescription, firstDebit.EditableExpenseDescription);
        Assert.Equal("uncategorized", firstDebit.Category);
        Assert.Equal(SunflowerStatementParser.SourceType, firstDebit.Provenance.SourceType);
        Assert.Equal(SunflowerStatementParser.RuleVersion, firstDebit.Provenance.ParserRuleVersion);
        Assert.Equal(3, result.Rows.Single(row => row.SourceDescription == "BROKERAGE FUNDING").Provenance.SourcePageNumber);

        var repeated = result.Rows.Where(row => row.SourceDescription == "REPEATED CAFE").ToList();
        Assert.Equal(2, repeated.Count);
        Assert.NotEqual(repeated[0].SourceRowOrdinal, repeated[1].SourceRowOrdinal);

        var ambiguous = Assert.Single(result.Rows, row => row.SourceDescription == "SOURCE DIRECTION UNKNOWN");
        Assert.Equal(ImportedTransactionDirection.Unresolved, ambiguous.Direction);
        Assert.Equal(ImportedRowClassification.NeedsReview, ambiguous.Classification);
        Assert.Null(ambiguous.Category);
    }

    [Fact]
    public void Statement_recognition_requires_source_metadata_and_transaction_structure()
    {
        var parser = new SunflowerStatementParser();
        Assert.Equal(
            "unsupported_statement_source",
            parser.Parse(Result("PRAIRIE BANK\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\nPosted Description Amount"))
                .Failure?.Code);
        Assert.Equal(
            "unsupported_statement_format",
            parser.Parse(Result("SUNFLOWER BANK\nSTATEMENT DATE 02/28/2026\nDays in Statement Period 28\nElectronic Transactions\nPosted Description Amount"))
                .Failure?.Code);
        Assert.Equal(
            "unsupported_statement_source",
            parser.Parse(Result("A GENERIC SUNFLOWER REFERENCE\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\nPosted Description Amount"))
                .Failure?.Code);
    }

    [Fact]
    public void Full_dates_use_fixed_statement_century_and_resolve_year_boundary()
    {
        var result = ParseRows(
            "STATEMENT DATE: 01/31/00",
            "12/31/99 PRIOR YEAR PURCHASE 10.00-",
            "01/01/00 CURRENT YEAR PURCHASE 11.00-");

        Assert.True(result.IsSuccess);
        Assert.Equal(new DateOnly(1999, 12, 31), result.Rows[0].PostedDate);
        Assert.Equal(new DateOnly(2000, 1, 1), result.Rows[1].PostedDate);
    }

    [Theory]
    [InlineData("02/29/26 PURCHASE 1.00-", "invalid_transaction_date")]
    [InlineData("02/01/24 PURCHASE 1.00-", "invalid_transaction_date")]
    [InlineData("02/01/26 PURCHASE 0.00-", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE 00.10-", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE 1,23.45-", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE 1.2-", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE 1.234-", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE $1.00-", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE (1.00)", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE +1.00", "invalid_transaction_amount")]
    [InlineData("02/01/26 PURCHASE 999999999999999999999999999999.00-", "invalid_transaction_amount")]
    [InlineData("02/01/26 1.00-", "unsupported_transaction_row")]
    public void Invalid_dates_and_amounts_become_controlled_invalid_rows(string row, string error)
    {
        var parsed = ParseRows("STATEMENT DATE: 02/28/26", row);

        Assert.True(parsed.IsSuccess);
        var invalid = Assert.Single(parsed.Rows);
        Assert.Equal(ImportedRowClassification.Invalid, invalid.Classification);
        Assert.Contains(error, invalid.Errors);
    }

    [Theory]
    [InlineData("1.00", 1)]
    [InlineData("1234.56", 1234.56)]
    [InlineData("1,234.56", 1234.56)]
    [InlineData("12,345,678.90", 12345678.90)]
    public void Plain_and_correctly_grouped_amounts_parse_invariantly(string sourceAmount, decimal expected)
    {
        var previousCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("de-DE");
            var result = ParseRows("STATEMENT DATE: 02/28/26", $"02/01/26 PURCHASE {sourceAmount}-");
            Assert.Equal(expected, Assert.Single(result.Rows).Amount);
        }
        finally
        {
            CultureInfo.CurrentCulture = previousCulture;
        }
    }

    [Fact]
    public void Wrapped_description_is_joined_but_orphan_content_is_surfaced()
    {
        var result = new SunflowerStatementParser().Parse(Result(
            "SUNFLOWER BANK ADJACENT HEADER\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\n" +
            "Electronic Transactions\nPosted Description Amount\n" +
            "02/01/26 SYNTHETIC MERCHANT 10.00-\n  CONTINUED DESCRIPTION\nUNRECOGNIZED ROW"));

        Assert.True(result.IsSuccess);
        Assert.Equal("SYNTHETIC MERCHANT CONTINUED DESCRIPTION", result.Rows[0].SourceDescription);
        Assert.Equal(ImportedRowClassification.Invalid, result.Rows[1].Classification);
        Assert.Contains("unsupported_transaction_row", result.Rows[1].Errors);
    }

    [Fact]
    public void Summary_headers_page_markers_balances_disclosures_and_no_checks_create_no_rows()
    {
        var result = new SunflowerStatementParser().Parse(Result(
            "SUNFLOWER BANK ADJACENT HEADER\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nPAGE 1 OF 1Daily Balance Summary\n02/01 100.00\n" +
            "Account Summary\nTotal Synthetic Debits 10.00\nElectronic Transactions\nPosted Description Amount\n" +
            "Checks Paid Electronically\n--- No Checks Paid Electronically in this statement cycle. ---\n" +
            "Checks Paid\nNo Checks Paid in this statement cycle.\n" +
            "Important Account Information\nSynthetic disclosure"));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Rows);
    }

    [Fact]
    public void Actual_check_rows_fail_closed_without_inventing_check_grammar()
    {
        var result = new SunflowerStatementParser().Parse(Result(
            "SUNFLOWER BANK\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\n" +
            "Posted Description Amount\nChecks Paid\n1001 02/01/26 10.00-"));

        Assert.Equal("unsupported_statement_format", result.Failure?.Code);
        Assert.Empty(result.Rows);
    }

    [Fact]
    public void No_check_decoration_is_bounded_to_the_evidenced_shape()
    {
        var result = new SunflowerStatementParser().Parse(Result(
            "SUNFLOWER HEADER\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\n" +
            "Posted Description Amount\nChecks Paid\n---- No Checks Paid in this statement cycle. ----"));

        Assert.Equal("unsupported_statement_format", result.Failure?.Code);
    }

    [Fact]
    public void Candidate_row_limit_accepts_1000_and_rejects_1001_without_partial_rows()
    {
        Assert.Equal(1000, ParseGeneratedRows(1000).Rows.Count);

        var exceeded = ParseGeneratedRows(1001);
        Assert.Equal("candidate_row_limit_exceeded", exceeded.Failure?.Code);
        Assert.Empty(exceeded.Rows);
    }

    [Fact]
    public async Task Generated_boundary_pdfs_flow_through_extractor_before_row_limit_enforcement()
    {
        var extractor = new ContainedPdfTextExtractor();
        var acceptedExtraction = await extractor.ExtractAsync(
            SunflowerAdversarialFixtures.CreateCandidateRowPdf(1000));
        var exceededExtraction = await extractor.ExtractAsync(
            SunflowerAdversarialFixtures.CreateCandidateRowPdf(1001));

        Assert.True(acceptedExtraction.IsSuccess);
        Assert.True(exceededExtraction.IsSuccess);
        Assert.Equal(1000, new SunflowerStatementParser().Parse(acceptedExtraction.Result!).Rows.Count);
        var exceeded = new SunflowerStatementParser().Parse(exceededExtraction.Result!);
        Assert.Equal("candidate_row_limit_exceeded", exceeded.Failure?.Code);
        Assert.Empty(exceeded.Rows);
    }

    [Fact]
    public void Invalid_description_and_deposit_debit_marker_do_not_become_candidates()
    {
        var oversized = ParseRows(
            "STATEMENT DATE: 02/28/26",
            $"02/01/26 {new string('X', 501)} 1.00-");
        Assert.Contains("invalid_transaction_description", Assert.Single(oversized.Rows).Errors);

        var depositDebit = new SunflowerStatementParser().Parse(Result(
            "SUNFLOWER BANK\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\n" +
            "Deposits\nPosted Description Amount\n02/01/26 SYNTHETIC CREDIT 1.00-"));
        var invalidDeposit = Assert.Single(depositDebit.Rows);
        Assert.Equal(ImportedRowClassification.Invalid, invalidDeposit.Classification);
        Assert.Contains("unsupported_transaction_direction", invalidDeposit.Errors);
    }

    [Fact]
    public void Page_order_must_match_extractor_contract()
    {
        var result = new SunflowerStatementParser().Parse(new PdfTextExtractionResult(
            0,
            1,
            0,
            new[] { new PdfExtractedPage(2, "SUNFLOWER BANK") }));

        Assert.Equal("unsupported_statement_format", result.Failure?.Code);
    }

    [Fact]
    public void Repeated_identical_statement_dates_are_valid_but_conflicts_fail_closed()
    {
        var repeated = MultiPageResult(
            "SUNFLOWER HEADER\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\nPosted Description Amount\n02/01/26 FIRST 1.00-",
            "STATEMENT DATE: 02/28/26\nPosted Description Amount\n02/02/26 SECOND 2.00-");
        Assert.Equal(2, new SunflowerStatementParser().Parse(repeated).Rows.Count);

        var conflicting = MultiPageResult(
            "SUNFLOWER HEADER\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\nPosted Description Amount",
            "STATEMENT DATE: 03/31/26");
        Assert.Equal("unsupported_statement_format", new SunflowerStatementParser().Parse(conflicting).Failure?.Code);
    }

    [Fact]
    public void Blank_interstitial_page_deactivates_rows_without_losing_header_only_continuation()
    {
        var extraction = MultiPageResult(
            "SUNFLOWER HEADER\nSTATEMENT DATE: 02/28/26\nDays in Statement Period: 28\nElectronic Transactions\nPosted Description Amount\n02/01/26 FIRST 1.00-",
            string.Empty,
            "STATEMENT DATE: 02/28/26\nPosted Description Amount\n02/02/26 SECOND 2.00-");

        var parsed = new SunflowerStatementParser().Parse(extraction);
        Assert.Equal(new[] { "FIRST", "SECOND" }, parsed.Rows.Select(row => row.SourceDescription));
        Assert.Equal(3, parsed.Rows[1].Provenance.SourcePageNumber);
    }

    [Theory]
    [InlineData("STATEMENT DATE: 02/30/26", "Days in Statement Period: 28")]
    [InlineData("STATEMENT DATE: 02/28/26", "Days in Statement Period 28")]
    public void Invalid_statement_metadata_fails_closed(string statementDate, string daysMarker)
    {
        var result = Result($"SUNFLOWER HEADER\n{statementDate}\n{daysMarker}\nElectronic Transactions\nPosted Description Amount");
        Assert.Equal("unsupported_statement_format", new SunflowerStatementParser().Parse(result).Failure?.Code);
    }

    private static SunflowerStatementParseResult ParseRows(string statementDate, params string[] rows) =>
        new SunflowerStatementParser().Parse(Result(string.Join(
            '\n',
            new[] { "SUNFLOWER BANK", statementDate, "Days in Statement Period: 28", "Electronic Transactions", "Posted Description Amount" }
                .Concat(rows))));

    private static SunflowerStatementParseResult ParseGeneratedRows(int count)
    {
        var rows = Enumerable.Range(1, count)
            .Select(index => $"02/{((index - 1) % 28) + 1:D2}/26 SYNTHETIC ROW {index:D4} 10.00-");
        return ParseRows("STATEMENT DATE: 02/28/26", rows.ToArray());
    }

    private static PdfTextExtractionResult Result(string text) =>
        new(0, 1, text.Length, new[] { new PdfExtractedPage(1, text) });

    private static PdfTextExtractionResult MultiPageResult(params string[] pages) =>
        new(
            0,
            pages.Length,
            pages.Sum(page => page.Length),
            pages.Select((page, index) => new PdfExtractedPage(index + 1, page)).ToArray());
}
