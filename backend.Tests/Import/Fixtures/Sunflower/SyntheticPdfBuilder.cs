using System.Text;

namespace BudgetPlanner.Tests.Import.Fixtures.Sunflower;

internal static class SyntheticPdfBuilder
{
    public static byte[] Build(IReadOnlyList<IReadOnlyList<string>> pages)
    {
        ArgumentNullException.ThrowIfNull(pages);

        if (pages.Count == 0)
        {
            throw new ArgumentException("At least one page is required.", nameof(pages));
        }

        var objects = new SortedDictionary<int, string>();
        var pageObjectNumbers = new List<int>(pages.Count);

        const int catalogObject = 1;
        const int pagesObject = 2;
        const int fontObject = 3;

        for (var index = 0; index < pages.Count; index++)
        {
            pageObjectNumbers.Add(4 + (index * 2));
        }

        objects[catalogObject] = "<< /Type /Catalog /Pages 2 0 R >>";
        objects[pagesObject] =
            $"<< /Type /Pages /Kids [{string.Join(" ", pageObjectNumbers.Select(number => $"{number} 0 R"))}] /Count {pages.Count} >>";
        objects[fontObject] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

        for (var index = 0; index < pages.Count; index++)
        {
            var pageObject = pageObjectNumbers[index];
            var contentObject = pageObject + 1;
            var content = BuildContentStream(pages[index]);
            var contentLength = Encoding.ASCII.GetByteCount(content);

            objects[pageObject] =
                $"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents {contentObject} 0 R >>";
            objects[contentObject] = $"<< /Length {contentLength} >>\nstream\n{content}endstream";
        }

        var maxObjectNumber = objects.Keys.Max();
        var offsets = new int[maxObjectNumber + 1];
        var output = new StringBuilder();
        var byteOffset = 0;

        void Append(string value)
        {
            output.Append(value);
            byteOffset += Encoding.ASCII.GetByteCount(value);
        }

        Append("%PDF-1.4\n% Budget Planner synthetic test fixture\n");

        foreach (var entry in objects)
        {
            offsets[entry.Key] = byteOffset;
            Append($"{entry.Key} 0 obj\n{entry.Value}\nendobj\n");
        }

        var xrefOffset = byteOffset;
        Append($"xref\n0 {maxObjectNumber + 1}\n");
        Append("0000000000 65535 f \n");

        for (var objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber++)
        {
            Append($"{offsets[objectNumber]:D10} 00000 n \n");
        }

        Append($"trailer\n<< /Size {maxObjectNumber + 1} /Root 1 0 R >>\n");
        Append($"startxref\n{xrefOffset}\n%%EOF\n");

        return Encoding.ASCII.GetBytes(output.ToString());
    }

    private static string BuildContentStream(IReadOnlyList<string> lines)
    {
        ArgumentNullException.ThrowIfNull(lines);

        var content = new StringBuilder();
        content.Append("BT\n/F1 10 Tf\n50 760 Td\n");

        for (var index = 0; index < lines.Count; index++)
        {
            var line = lines[index];
            EnsureAscii(line);

            if (index > 0)
            {
                content.Append("0 -14 Td\n");
            }

            content.Append('(')
                .Append(EscapePdfLiteral(line))
                .Append(") Tj\n");
        }

        content.Append("ET\n");
        return content.ToString();
    }

    private static string EscapePdfLiteral(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal);

    private static void EnsureAscii(string value)
    {
        if (value.Any(character => character > 127))
        {
            throw new ArgumentException("Synthetic PDF fixture text must remain ASCII for deterministic byte offsets.", nameof(value));
        }
    }
}
