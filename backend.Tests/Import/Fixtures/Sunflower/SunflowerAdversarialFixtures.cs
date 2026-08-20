using System.Text;

namespace BudgetPlanner.Tests.Import.Fixtures.Sunflower;

public static class SunflowerAdversarialFixtures
{
    private const int CandidateRowsPerPage = 50;

    public static byte[] CreateInvalidSignatureInput() =>
        Encoding.ASCII.GetBytes("THIS IS NOT A PDF\n");

    public static byte[] CreateTruncatedPdf()
    {
        var valid = SunflowerFixtureCorpus.CreateRepresentativePdf();
        var truncatedLength = Math.Max(8, valid.Length - 64);
        return valid[..truncatedLength];
    }

    public static byte[] CreateUnsupportedBankPdf() =>
        SyntheticPdfBuilder.Build(
            new IReadOnlyList<string>[]
            {
                new List<string>
                {
                    "PRAIRIE COMMUNITY BANK",
                    "STATEMENT DATE 02/28/2026",
                    "Days in Statement Period 28",
                    "Electronic Transactions",
                    "Posted Description Amount",
                    "02/14/26 SAMPLE PURCHASE 19.25-"
                }
            });

    public static byte[] CreatePageCountPdf(int pageCount)
    {
        if (pageCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(pageCount));
        }

        var pages = new List<IReadOnlyList<string>>(pageCount);

        for (var page = 1; page <= pageCount; page++)
        {
            pages.Add(
                new List<string>
                {
                    "SUNFLOWER BANK",
                    $"SYNTHETIC PAGE {page:D3}"
                });
        }

        return SyntheticPdfBuilder.Build(pages);
    }

    public static byte[] CreateCandidateRowPdf(int rowCount)
    {
        if (rowCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(rowCount));
        }

        var pageCount = (int)Math.Ceiling(rowCount / (double)CandidateRowsPerPage);
        var pages = new List<IReadOnlyList<string>>(pageCount);
        var nextRow = 1;

        for (var page = 0; page < pageCount; page++)
        {
            var lines = new List<string>
            {
                "SUNFLOWER BANK",
                $"Page {page + 1} of {pageCount}"
            };

            if (page == 0)
            {
                lines.Add("STATEMENT DATE 02/28/2026");
                lines.Add("Days in Statement Period 28");
                lines.Add("Electronic Transactions");
            }
            else
            {
                lines.Add("Electronic Transactions (continued)");
            }
            lines.Add("Posted Description Amount");

            for (var pageRow = 0; pageRow < CandidateRowsPerPage && nextRow <= rowCount; pageRow++)
            {
                var day = ((nextRow - 1) % 28) + 1;
                var amount = 10m + ((nextRow - 1) % 90) + 0.25m;
                lines.Add(FormattableString.Invariant($"02/{day:D2}/26 SYNTHETIC ROW {nextRow:D4} {amount:0.00}-"));
                nextRow++;
            }

            pages.Add(lines);
        }

        return SyntheticPdfBuilder.Build(pages);
    }

    public static byte[] CreateTextVolumePdf(int payloadCharacterCount)
    {
        if (payloadCharacterCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(payloadCharacterCount));
        }

        return SyntheticPdfBuilder.Build(
            new IReadOnlyList<string>[]
            {
                new List<string>
                {
                    "SUNFLOWER BANK",
                    "SYNTHETIC TEXT VOLUME PAYLOAD",
                    new string('X', payloadCharacterCount)
                }
            });
    }
}
