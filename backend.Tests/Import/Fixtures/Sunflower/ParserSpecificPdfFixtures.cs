namespace BudgetPlanner.Tests.Import.Fixtures.Sunflower;

internal static class ParserSpecificPdfFixtures
{
    public static byte[] InvalidPdf() => "%PDF-1.4\ntruncated"u8.ToArray();

    public static byte[] ImageOnlyPdf() =>
        SyntheticPdfBuilder.Build(new IReadOnlyList<string>[] { Array.Empty<string>() });

    public static byte[] ActiveContentPdf() =>
        SyntheticPdfBuilder.Build(
            new IReadOnlyList<string>[] { new[] { "SAFE SYNTHETIC TEXT" } },
            "/OpenAction << /S /JavaScript /JS (app.alert\\(demo\\)) >>");

    public static byte[] PageCountPdf(int pages) =>
        SyntheticPdfBuilder.Build(Enumerable.Range(1, pages)
            .Select(index => (IReadOnlyList<string>)new[] { $"SYNTHETIC PAGE {index}" })
            .ToArray());

    public static byte[] TextVolumePdf(int characters)
    {
        var pages = new List<IReadOnlyList<string>>();
        var pageCount = Math.Min(25, Math.Max(1, (characters + 80_000 - 1) / 80_000));
        for (var page = 0; page < pageCount; page++)
        {
            var remainingPages = pageCount - page;
            var pageCharacters = (characters + remainingPages - 1) / remainingPages;
            var lines = new List<string>();
            while (pageCharacters > 0)
            {
                var length = Math.Min(1_000, pageCharacters);
                lines.Add(new string('X', length));
                pageCharacters -= length;
                characters -= length;
            }
            pages.Add(lines);
        }
        return SyntheticPdfBuilder.Build(pages);
    }
}
