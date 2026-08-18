using System.Text;
using BudgetPlanner.Tests.Import.Fixtures.Sunflower;
using Xunit;

namespace BudgetPlanner.Tests.Import;

public sealed class SunflowerFixtureCorpusTests
{
    [Fact]
    public void Representative_fixture_is_deterministic_and_pdf_shaped()
    {
        var first = SunflowerFixtureCorpus.CreateRepresentativePdf();
        var second = SunflowerFixtureCorpus.CreateRepresentativePdf();
        var text = Encoding.ASCII.GetString(first);

        Assert.Equal(first, second);
        Assert.True(text.StartsWith("%PDF-1.4", StringComparison.Ordinal));
        Assert.True(text.EndsWith("%%EOF\n", StringComparison.Ordinal));
        Assert.Equal(4, CountOccurrences(text, "/Type /Page "));
    }

    [Fact]
    public void Representative_corpus_covers_required_synthetic_scenarios()
    {
        var scenarioIds = SunflowerFixtureCorpus.Scenarios
            .Select(scenario => scenario.Id)
            .ToHashSet(StringComparer.Ordinal);

        var requiredScenarioIds = new[]
        {
            "deposit-credit",
            "merchant-debit",
            "subscription-debit",
            "rent-debit",
            "bank-fee-debit",
            "card-payment-debit",
            "p2p-debit",
            "transfer-debit",
            "brokerage-debit",
            "repeated-outflow",
            "ambiguous-source-row"
        };

        foreach (var requiredScenarioId in requiredScenarioIds)
        {
            Assert.Contains(requiredScenarioId, scenarioIds);
        }

        Assert.True(SunflowerFixtureCorpus.RepresentativePages[0].Lines.Contains("Deposits"));
        Assert.True(SunflowerFixtureCorpus.RepresentativePages[0].Lines.Contains("Electronic Transactions"));
        Assert.True(SunflowerFixtureCorpus.RepresentativePages[1].Lines.Contains("Electronic Transactions (continued)"));
        Assert.False(SunflowerFixtureCorpus.RepresentativePages[2].ContainsTransactions);
        Assert.False(SunflowerFixtureCorpus.RepresentativePages[3].ContainsTransactions);

        var repeatedOutflows = SunflowerFixtureCorpus.RepresentativePages
            .SelectMany(page => page.Lines)
            .Count(line => line == "02/12 REPEATED CAFE 8.50-");

        Assert.Equal(2, repeatedOutflows);
    }

    [Fact]
    public void Scenario_metadata_matches_approved_checking_outflow_semantics()
    {
        var debitScenarios = SunflowerFixtureCorpus.Scenarios
            .Where(scenario => scenario.Direction == SyntheticDirection.Debit)
            .ToList();

        Assert.NotEmpty(debitScenarios);
        Assert.All(debitScenarios, scenario => Assert.Equal("expense_candidate", scenario.ExpectedClassification));
        Assert.Equal(
            "non_expense",
            Assert.Single(SunflowerFixtureCorpus.Scenarios.Where(scenario => scenario.Direction == SyntheticDirection.Credit))
                .ExpectedClassification);
        Assert.Equal(
            "needs_review",
            Assert.Single(SunflowerFixtureCorpus.Scenarios.Where(scenario => scenario.Direction == SyntheticDirection.Unknown))
                .ExpectedClassification);
    }

    [Fact]
    public void Adversarial_helpers_cover_invalid_truncated_and_unsupported_shapes()
    {
        var invalid = Encoding.ASCII.GetString(SunflowerAdversarialFixtures.CreateInvalidSignatureInput());
        var truncated = Encoding.ASCII.GetString(SunflowerAdversarialFixtures.CreateTruncatedPdf());
        var unsupported = Encoding.ASCII.GetString(SunflowerAdversarialFixtures.CreateUnsupportedBankPdf());

        Assert.False(invalid.StartsWith("%PDF-", StringComparison.Ordinal));
        Assert.True(truncated.StartsWith("%PDF-", StringComparison.Ordinal));
        Assert.False(truncated.EndsWith("%%EOF\n", StringComparison.Ordinal));
        Assert.Contains("PRAIRIE COMMUNITY BANK", unsupported, StringComparison.Ordinal);
        Assert.DoesNotContain("SUNFLOWER BANK", unsupported, StringComparison.Ordinal);
    }

    [Fact]
    public void Limit_generators_create_requested_page_row_and_text_shapes()
    {
        var pageLimitText = Encoding.ASCII.GetString(SunflowerAdversarialFixtures.CreatePageCountPdf(26));
        var rowLimitText = Encoding.ASCII.GetString(SunflowerAdversarialFixtures.CreateCandidateRowPdf(1001));
        var textLimitText = Encoding.ASCII.GetString(SunflowerAdversarialFixtures.CreateTextVolumePdf(2_000_001));

        Assert.Equal(26, CountOccurrences(pageLimitText, "/Type /Page "));
        Assert.Equal(1001, CountOccurrences(rowLimitText, "SYNTHETIC ROW "));
        Assert.True(textLimitText.Count(character => character == 'X') >= 2_000_001);
    }

    [Fact]
    public void Exact_duplicate_fixture_bytes_are_stable()
    {
        var original = SunflowerFixtureCorpus.CreateRepresentativePdf();
        var duplicate = SunflowerFixtureCorpus.CreateRepresentativePdf();

        Assert.Equal(original, duplicate);
    }

    private static int CountOccurrences(string text, string value)
    {
        var count = 0;
        var index = 0;

        while ((index = text.IndexOf(value, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += value.Length;
        }

        return count;
    }
}
