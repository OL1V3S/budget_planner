namespace BudgetPlanner.Import.Sunflower;

public interface ISunflowerStatementParser
{
    SunflowerStatementParseResult Parse(PdfTextExtractionResult extraction);
}
