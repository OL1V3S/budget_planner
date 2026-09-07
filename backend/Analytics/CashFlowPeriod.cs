using System.Globalization;

namespace BudgetPlanner.Analytics;

public sealed record CashFlowPeriod
{
    public DateOnly MonthStart { get; }
    public DateOnly ThroughDate { get; }
    public DateOnly To { get; }
    public DateOnly TrendFrom { get; }
    public string Month => MonthKey(MonthStart);

    private CashFlowPeriod(DateOnly monthStart, DateOnly throughDate)
    {
        MonthStart = monthStart;
        ThroughDate = throughDate;
        var monthEnd = MonthEnd(monthStart);
        To = throughDate < monthEnd ? throughDate : monthEnd;
        var monthsSinceMinimum = (monthStart.Year - 1) * 12 + monthStart.Month - 1;
        TrendFrom = monthStart.AddMonths(-Math.Min(5, monthsSinceMinimum));
    }

    public static bool TryCreate(string? month, string? throughDate, out CashFlowPeriod? period)
    {
        period = null;
        if (month?.Length != 7 || throughDate?.Length != 10
            || !DateOnly.TryParseExact($"{month}-01", "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var monthStart)
            || !DateOnly.TryParseExact(throughDate, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var cutoff)
            || MonthKey(monthStart) != month
            || cutoff.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) != throughDate
            || monthStart > cutoff)
            return false;

        period = new(monthStart, cutoff);
        return true;
    }

    public static string MonthKey(DateOnly date) => date.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public static DateOnly MonthEnd(DateOnly date) =>
        new(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month));
}
