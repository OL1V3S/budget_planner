namespace BudgetPlanner.Tests.Import.Fixtures.Sunflower;

public enum SyntheticDirection
{
    Credit,
    Debit,
    Unknown
}

public sealed record SyntheticTransactionScenario(
    string Id,
    string SourceLine,
    SyntheticDirection Direction,
    string ExpectedClassification,
    string Section);

public sealed record SyntheticStatementPage(
    string Name,
    bool ContainsTransactions,
    IReadOnlyList<string> Lines);

public static class SunflowerFixtureCorpus
{
    public static IReadOnlyList<SyntheticTransactionScenario> Scenarios { get; } =
        new List<SyntheticTransactionScenario>
        {
            new("deposit-credit", "02/03 DEMO PAYROLL CREDIT 2450.00", SyntheticDirection.Credit, "non_expense", "Deposits"),
            new("merchant-debit", "02/05 NORTH STAR MARKET 42.16-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("subscription-debit", "02/04 STREAMCO SUBSCRIPTION 7.99-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("rent-debit", "02/06 HOME RENT PAYMENT 1125.00-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("bank-fee-debit", "02/07 ACCOUNT MAINTENANCE FEE 5.00-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("card-payment-debit", "02/08 CARDCO PAYMENT 225.00-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("p2p-debit", "02/09 P2P DEMO PAYMENT 35.00-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("transfer-debit", "02/10 TRANSFER TO SAVINGS 100.00-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("brokerage-debit", "02/11 BROKERAGE FUNDING 75.00-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("repeated-outflow", "02/12 REPEATED CAFE 8.50-", SyntheticDirection.Debit, "expense_candidate", "Electronic Transactions"),
            new("ambiguous-source-row", "02/13 SOURCE DIRECTION UNKNOWN 12.34", SyntheticDirection.Unknown, "needs_review", "Electronic Transactions")
        };

    public static IReadOnlyList<SyntheticStatementPage> RepresentativePages { get; } =
        new List<SyntheticStatementPage>
        {
            new(
                "summary-and-first-transactions",
                true,
                new List<string>
                {
                    "SUNFLOWER BANK",
                    "FIRST NATIONAL 1870",
                    "ACCOUNT NUMBER 000000000001",
                    "STATEMENT DATE 02/28/2026",
                    "Deposits",
                    "02/03 DEMO PAYROLL CREDIT 2450.00",
                    "02/03 DEMO REIMBURSEMENT CREDIT 18.25",
                    "Electronic Transactions",
                    "02/04 STREAMCO SUBSCRIPTION 7.99-",
                    "02/05 NORTH STAR MARKET 42.16-",
                    "02/06 HOME RENT PAYMENT 1125.00-",
                    "02/07 ACCOUNT MAINTENANCE FEE 5.00-",
                    "02/08 CARDCO PAYMENT 225.00-",
                    "02/09 P2P DEMO PAYMENT 35.00-",
                    "02/10 TRANSFER TO SAVINGS 100.00-"
                }),
            new(
                "continued-transactions",
                true,
                new List<string>
                {
                    "SUNFLOWER BANK",
                    "Electronic Transactions (continued)",
                    "02/11 BROKERAGE FUNDING 75.00-",
                    "02/12 REPEATED CAFE 8.50-",
                    "02/12 REPEATED CAFE 8.50-",
                    "02/13 SOURCE DIRECTION UNKNOWN 12.34",
                    "Checks Paid",
                    "NONE"
                }),
            new(
                "daily-balances",
                false,
                new List<string>
                {
                    "SUNFLOWER BANK",
                    "Daily Balances",
                    "02/03 3100.00",
                    "02/10 1520.35",
                    "02/17 1430.10",
                    "02/28 1398.27"
                }),
            new(
                "disclosures",
                false,
                new List<string>
                {
                    "SUNFLOWER BANK",
                    "Important Account Information",
                    "This page contains synthetic disclosure text for parser fixtures only.",
                    "No transaction rows appear on this page."
                })
        };

    public static byte[] CreateRepresentativePdf() =>
        SyntheticPdfBuilder.Build(RepresentativePages.Select(page => page.Lines).ToArray());
}
