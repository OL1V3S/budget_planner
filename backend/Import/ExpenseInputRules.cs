using System.Text.RegularExpressions;

namespace BudgetPlanner.Import;

public static partial class ExpenseInputRules
{
    public const decimal MaximumAmount = 9999999999999999.99m;

    public static string NormalizeDescription(string? value) => (value ?? "").Trim();

    public static string NormalizeDescriptionForComparison(string? value) =>
        WhitespaceRegex().Replace(NormalizeDescription(value), " ").ToLowerInvariant();

    public static string NormalizeCategory(string? value) =>
        WhitespaceRegex().Replace((value ?? "").Trim(), " ").ToLowerInvariant();

    public static IReadOnlyList<string> Validate(decimal? amount, DateOnly? date, string? description, string? category)
    {
        var errors = new List<string>();
        if (date is null) errors.Add("date_required");
        if (amount is null || amount <= 0m) errors.Add("amount_must_be_positive");
        else
        {
            if (amount > MaximumAmount) errors.Add("amount_out_of_range");
            if (decimal.Round(amount.Value, 2) != amount.Value) errors.Add("amount_precision_invalid");
        }

        var normalizedDescription = NormalizeDescription(description);
        if (normalizedDescription.Length == 0) errors.Add("description_required");
        else if (normalizedDescription.Length > 500) errors.Add("description_too_long");

        var normalizedCategory = NormalizeCategory(category);
        if (normalizedCategory.Length == 0) errors.Add("category_required");
        else if (normalizedCategory.Length > 100) errors.Add("category_too_long");
        else if (normalizedCategory == "other") errors.Add("category_reserved");
        return errors;
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
