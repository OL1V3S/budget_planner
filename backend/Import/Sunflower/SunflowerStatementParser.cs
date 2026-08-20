using System.Globalization;
using System.Text.RegularExpressions;

namespace BudgetPlanner.Import.Sunflower;

public sealed partial class SunflowerStatementParser : ISunflowerStatementParser
{
    public const string SourceType = "sunflower_pdf";
    public const string RuleVersion = "sunflower-v1";
    public const int MaximumCandidateRows = 1_000;

    private const string DepositsSection = "deposits";
    private const string ElectronicTransactionsSection = "electronic_transactions";

    public SunflowerStatementParseResult Parse(PdfTextExtractionResult extraction)
    {
        ArgumentNullException.ThrowIfNull(extraction);

        if (!HasOrderedPages(extraction.Pages))
        {
            return SunflowerStatementParseResult.Failed(SunflowerStatementParseFailure.UnsupportedFormat);
        }

        var firstTextPage = extraction.Pages.FirstOrDefault(page => !string.IsNullOrWhiteSpace(page.Text));
        if (firstTextPage is null || !SunflowerHeaderRegex().IsMatch(firstTextPage.Text))
        {
            return SunflowerStatementParseResult.Failed(SunflowerStatementParseFailure.UnsupportedSource);
        }

        var statementDates = extraction.Pages
            .SelectMany(page => StatementDateRegex().Matches(page.Text).Select(match => match.Groups["date"].Value))
            .Select(value => TryParseStatementDate(value, out var date) ? date : (DateOnly?)null)
            .Where(date => date.HasValue)
            .Select(date => date!.Value)
            .Distinct()
            .ToList();

        var hasDaysMarker = extraction.Pages.Any(page => DaysInStatementPeriodRegex().IsMatch(page.Text));
        var hasTransactionHeading = extraction.Pages.SelectMany(SplitLines).Any(line => IsTransactionHeading(line.Trim()));
        var hasColumnHeader = extraction.Pages.Any(page =>
            page.Text.Contains("Posted Description Amount", StringComparison.OrdinalIgnoreCase));
        if (statementDates.Count != 1 || !hasDaysMarker || !hasTransactionHeading || !hasColumnHeader)
        {
            return SunflowerStatementParseResult.Failed(SunflowerStatementParseFailure.UnsupportedFormat);
        }

        var statementDate = statementDates[0];
        var rows = new List<NormalizedImportedRow>();
        string? rememberedSection = null;

        foreach (var page in extraction.Pages)
        {
            string? section = null;
            string? pendingSection = null;
            PendingRow? pendingRow = null;
            var inUnsupportedCheckSection = false;

            void FlushPending()
            {
                if (pendingRow is null)
                {
                    return;
                }

                rows.Add(ParseRow(pendingRow, statementDate, rows.Count + 1));
                pendingRow = null;
            }

            foreach (var sourceLine in SplitLines(page).Select(line => new SourceLine(page.PageNumber, line)))
            {
                var trimmed = sourceLine.Text.Trim();
                if (trimmed.Length == 0)
                {
                    continue;
                }

                if (pendingRow is not null && char.IsWhiteSpace(sourceLine.Text[0]) && !IsStructuralLine(trimmed))
                {
                    pendingRow.DescriptionContinuation.Add(trimmed);
                    continue;
                }

                FlushPending();

                if (trimmed.Equals("Checks Paid", StringComparison.OrdinalIgnoreCase)
                    || trimmed.Equals("Checks Paid Electronically", StringComparison.OrdinalIgnoreCase))
                {
                    section = null;
                    pendingSection = null;
                    rememberedSection = null;
                    inUnsupportedCheckSection = true;
                    continue;
                }

                if (inUnsupportedCheckSection)
                {
                    if (IsNoChecksMessage(trimmed) || IsKnownNonRow(trimmed))
                    {
                        continue;
                    }

                    if (IsNonTransactionBoundary(trimmed))
                    {
                        inUnsupportedCheckSection = false;
                    }
                    else
                    {
                        return SunflowerStatementParseResult.Failed(
                            SunflowerStatementParseFailure.UnsupportedFormat);
                    }
                }

                if (TryGetTransactionHeading(trimmed, out var headingSection))
                {
                    pendingSection = headingSection;
                    rememberedSection = headingSection;
                    continue;
                }

                if (trimmed.Equals("Posted Description Amount", StringComparison.OrdinalIgnoreCase))
                {
                    section = pendingSection
                              ?? (rememberedSection == ElectronicTransactionsSection ? rememberedSection : null);
                    continue;
                }

                if (IsNonTransactionBoundary(trimmed))
                {
                    section = null;
                    pendingSection = null;
                    if (IsTerminalBoundary(trimmed))
                    {
                        rememberedSection = null;
                    }
                    continue;
                }

                if (section is null || IsKnownNonRow(trimmed))
                {
                    continue;
                }

                if (LooksLikeTransactionStart(trimmed))
                {
                    if (rows.Count >= MaximumCandidateRows)
                    {
                        return SunflowerStatementParseResult.Failed(
                            SunflowerStatementParseFailure.CandidateRowLimitExceeded);
                    }

                    pendingRow = new PendingRow(sourceLine.PageNumber, section, trimmed);
                    continue;
                }

                if (!IsKnownSectionContent(trimmed))
                {
                    if (rows.Count >= MaximumCandidateRows)
                    {
                        return SunflowerStatementParseResult.Failed(
                            SunflowerStatementParseFailure.CandidateRowLimitExceeded);
                    }

                    rows.Add(CreateInvalidRow(
                        sourceLine.PageNumber,
                        section,
                        rows.Count + 1,
                        "unsupported_transaction_row"));
                }
            }

            FlushPending();
        }
        return SunflowerStatementParseResult.Success(rows);
    }

    private static NormalizedImportedRow ParseRow(PendingRow pending, DateOnly statementDate, int ordinal)
    {
        var match = TransactionRowRegex().Match(pending.SourceLine);
        if (!match.Success)
        {
            return CreateInvalidRow(pending.PageNumber, pending.Section, ordinal, "unsupported_transaction_row");
        }

        var description = string.Join(
            " ",
            new[] { match.Groups["description"].Value.Trim() }
                .Concat(pending.DescriptionContinuation)
                .Where(value => value.Length > 0));
        var errors = new List<string>();

        DateOnly? postedDate = TryResolveDate(match.Groups["date"].Value, statementDate, out var date)
            ? date
            : null;
        if (postedDate is null)
        {
            errors.Add("invalid_transaction_date");
        }

        decimal? amount = TryParseAmount(match.Groups["amount"].Value, out var parsedAmount)
            ? parsedAmount
            : null;
        if (amount is null)
        {
            errors.Add("invalid_transaction_amount");
        }

        if (description.Length == 0 || description.Length > 500)
        {
            errors.Add("invalid_transaction_description");
        }

        var hasDebitMarker = match.Groups["debit"].Success;
        var direction = ImportedTransactionDirection.Unresolved;
        var classification = ImportedRowClassification.NeedsReview;

        if (errors.Count > 0)
        {
            classification = ImportedRowClassification.Invalid;
        }
        else if (pending.Section == DepositsSection && !hasDebitMarker)
        {
            direction = ImportedTransactionDirection.Credit;
            classification = ImportedRowClassification.NonExpense;
        }
        else if (pending.Section == ElectronicTransactionsSection && hasDebitMarker)
        {
            direction = ImportedTransactionDirection.Debit;
            classification = ImportedRowClassification.ExpenseCandidate;
        }
        else if (pending.Section == DepositsSection && hasDebitMarker)
        {
            errors.Add("unsupported_transaction_direction");
            classification = ImportedRowClassification.Invalid;
        }

        var eligible = classification == ImportedRowClassification.ExpenseCandidate;
        return new NormalizedImportedRow(
            ordinal,
            postedDate,
            amount,
            direction,
            description,
            pending.Section,
            classification,
            eligible ? description : null,
            eligible ? "uncategorized" : null,
            errors,
            Array.Empty<string>(),
            new ImportRowProvenance(SourceType, RuleVersion, pending.PageNumber, pending.Section, ordinal));
    }

    private static NormalizedImportedRow CreateInvalidRow(int pageNumber, string section, int ordinal, string error) =>
        new(
            ordinal,
            null,
            null,
            ImportedTransactionDirection.Unresolved,
            string.Empty,
            section,
            ImportedRowClassification.Invalid,
            null,
            null,
            new[] { error },
            Array.Empty<string>(),
            new ImportRowProvenance(SourceType, RuleVersion, pageNumber, section, ordinal));

    private static bool TryResolveDate(string value, DateOnly statementDate, out DateOnly date)
    {
        date = default;
        var match = TransactionDateRegex().Match(value);
        if (!match.Success)
        {
            return false;
        }

        var month = int.Parse(match.Groups["month"].Value, CultureInfo.InvariantCulture);
        var day = int.Parse(match.Groups["day"].Value, CultureInfo.InvariantCulture);
        var shortYear = int.Parse(match.Groups["year"].Value, CultureInfo.InvariantCulture);
        var year = new[] { statementDate.Year, statementDate.Year - 1 }
            .Where(candidate => candidate % 100 == shortYear)
            .Cast<int?>()
            .SingleOrDefault();

        if (year is null)
        {
            return false;
        }

        return DateOnly.TryParseExact(
            $"{year:D4}-{month:D2}-{day:D2}",
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
    }

    private static bool TryParseAmount(string value, out decimal amount)
    {
        amount = default;
        if (!AmountRegex().IsMatch(value))
        {
            return false;
        }

        return decimal.TryParse(
                   value.Replace(",", string.Empty, StringComparison.Ordinal),
                   NumberStyles.AllowDecimalPoint,
                   CultureInfo.InvariantCulture,
                   out amount)
               && amount > 0;
    }

    private static bool TryParseStatementDate(string value, out DateOnly date)
    {
        date = default;
        var match = TransactionDateRegex().Match(value);
        if (!match.Success)
        {
            return false;
        }

        var month = int.Parse(match.Groups["month"].Value, CultureInfo.InvariantCulture);
        var day = int.Parse(match.Groups["day"].Value, CultureInfo.InvariantCulture);
        var year = 2000 + int.Parse(match.Groups["year"].Value, CultureInfo.InvariantCulture);
        return DateOnly.TryParseExact(
            $"{year:D4}-{month:D2}-{day:D2}",
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
    }

    private static bool HasOrderedPages(IReadOnlyList<PdfExtractedPage> pages) =>
        pages.Count > 0
        && pages.Select(page => page.PageNumber).SequenceEqual(Enumerable.Range(1, pages.Count));

    private static IEnumerable<string> SplitLines(PdfExtractedPage page)
    {
        var text = page.Text.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
        var fixedMarkers = new[]
        {
            "Important Account Information",
            "Posted Description Amount",
            "Electronic Transactions",
            "Days in Statement Period",
            "Transaction Summary",
            "Account Summary",
            "Daily Balance Summary",
            "SUNFLOWER BANK",
            "Deposits"
        };

        var markerPattern = string.Join("|", fixedMarkers.Select(Regex.Escape));
        text = Regex.Replace(
            text,
            markerPattern,
            match => $"\n{match.Value}\n",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        text = Regex.Replace(
            text,
            @"(?<!No )Checks Paid Electronically|(?<!No )Checks Paid",
            match => $"\n{match.Value}\n",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        text = Regex.Replace(
            text,
            @"STATEMENT DATE:\s*\d{2}/\d{2}/\d{2}",
            match => $"\n{match.Value}\n",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        text = Regex.Replace(
            text,
            @"Page\s+\d+\s+of\s+\d+",
            match => $"\n{match.Value}\n",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        text = Regex.Replace(
            text,
            @"(?=\d{2}/\d{2}/\d{2}\s)",
            "\n",
            RegexOptions.CultureInvariant);
        text = NoChecksMessageRegex().Replace(text, match => $"\n{match.Value}\n");

        return text.Split('\n');
    }

    private static bool LooksLikeTransactionStart(string line) =>
        line.Length >= 8 && char.IsAsciiDigit(line[0]) && line[2] == '/' && line[5] == '/';

    private static bool IsTransactionHeading(string line) => TryGetTransactionHeading(line, out _);

    private static bool TryGetTransactionHeading(string line, out string? section)
    {
        section = line switch
        {
            var value when value.Equals("Deposits", StringComparison.OrdinalIgnoreCase) => DepositsSection,
            var value when value.Equals("Electronic Transactions", StringComparison.OrdinalIgnoreCase) => ElectronicTransactionsSection,
            _ => null
        };
        return section is not null;
    }

    private static bool IsNonTransactionBoundary(string line) =>
        line.Equals("Daily Balance Summary", StringComparison.OrdinalIgnoreCase)
        || line.Equals("Important Account Information", StringComparison.OrdinalIgnoreCase)
        || line.Equals("Checks Paid", StringComparison.OrdinalIgnoreCase)
        || line.Equals("Checks Paid Electronically", StringComparison.OrdinalIgnoreCase)
        || line.Equals("Account Summary", StringComparison.OrdinalIgnoreCase)
        || line.Equals("Transaction Summary", StringComparison.OrdinalIgnoreCase);

    private static bool IsTerminalBoundary(string line) =>
        line.Equals("Daily Balance Summary", StringComparison.OrdinalIgnoreCase)
        || line.Equals("Important Account Information", StringComparison.OrdinalIgnoreCase);

    private static bool IsKnownNonRow(string line) =>
        line.StartsWith("Page ", StringComparison.OrdinalIgnoreCase)
        || line.Equals("SUNFLOWER BANK", StringComparison.OrdinalIgnoreCase)
        || StatementDateRegex().IsMatch(line)
        || DaysInStatementPeriodRegex().IsMatch(line);

    private static bool IsNoChecksMessage(string line) => NoChecksMessageRegex().IsMatch(line.Trim());

    private static bool IsKnownSectionContent(string line) =>
        line.StartsWith("Total ", StringComparison.OrdinalIgnoreCase);

    private static bool IsStructuralLine(string line) =>
        IsTransactionHeading(line)
        || IsNonTransactionBoundary(line)
        || line.Equals("Posted Description Amount", StringComparison.OrdinalIgnoreCase);

    private sealed record SourceLine(int PageNumber, string Text);

    private sealed class PendingRow(int pageNumber, string section, string sourceLine)
    {
        public int PageNumber { get; } = pageNumber;
        public string Section { get; } = section;
        public string SourceLine { get; } = sourceLine;
        public List<string> DescriptionContinuation { get; } = new();
    }

    [GeneratedRegex(@"(?<![A-Za-z])STATEMENT DATE:\s*(?<date>\d{2}/\d{2}/\d{2})(?![\d/])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex StatementDateRegex();

    [GeneratedRegex(@"(?<![A-Za-z])Days in Statement Period:\s*\d+(?=\s|Page|Electronic Transactions|Deposits|$)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex DaysInStatementPeriodRegex();

    [GeneratedRegex(@"^\s*SUNFLOWER\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SunflowerHeaderRegex();

    [GeneratedRegex(@"^(?:---\s*)?No Checks Paid(?: Electronically)? in this statement cycle\.(?:\s*---)?$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex NoChecksMessageRegex();

    [GeneratedRegex(@"^(?<date>\d{2}/\d{2}/\d{2})\s+(?<description>.*?)\s+(?<amount>\S+?)(?<debit>-)?$", RegexOptions.CultureInvariant)]
    private static partial Regex TransactionRowRegex();

    [GeneratedRegex(@"^(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{2})$", RegexOptions.CultureInvariant)]
    private static partial Regex TransactionDateRegex();

    [GeneratedRegex(@"^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\.\d{2}$", RegexOptions.CultureInvariant)]
    private static partial Regex AmountRegex();
}
