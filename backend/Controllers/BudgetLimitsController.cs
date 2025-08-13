using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BudgetPlanner.Data;

[ApiController]
[Route("api/[controller]")]
public class BudgetLimitsController : ControllerBase
{
    private readonly BudgetContext _context;

    public BudgetLimitsController(BudgetContext context)
    {
        _context = context;
    }

    // Helper method to calculate next reset date
    private DateTime? CalculateNextReset(DateTime? lastReset, string? resetFrequency)
    {
        if (lastReset == null || string.IsNullOrEmpty(resetFrequency) || resetFrequency == "None")
            return null;

        int daysToAdd = resetFrequency switch
        {
            "Weekly" => 7,
            "Biweekly" => 14,
            "Monthly" => 30,
            _ => 0
        };

        if (daysToAdd == 0)
            return null;

        var nextReset = lastReset.Value.AddDays(daysToAdd);
        var now = DateTime.UtcNow;

        while (nextReset <= now)
        {
            nextReset = nextReset.AddDays(daysToAdd);
        }

        return nextReset;
    }

    // GET api/budgetlimits?monthYear=2025-08
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BudgetLimit>>> GetBudgetLimits([FromQuery] string monthYear)
    {
        if (string.IsNullOrEmpty(monthYear))
            return BadRequest("monthYear query parameter is required.");

        if (!DateTime.TryParse($"{monthYear}-01", out var monthYearDate))
            return BadRequest("Invalid monthYear format. Expected format: YYYY-MM");

        var limits = await _context.BudgetLimits
            .Where(b => b.MonthYear.Year == monthYearDate.Year && b.MonthYear.Month == monthYearDate.Month)
            .ToListAsync();

        // Optional: compute NextReset on the fly before returning
        foreach (var limit in limits)
        {
            limit.NextReset = CalculateNextReset(limit.LastReset, limit.ResetFrequency);
        }

        return Ok(limits);
    }

    // POST api/budgetlimits
    [HttpPost]
    public async Task<ActionResult> SetBudgetLimit(BudgetLimit limit)
    {
        if (string.IsNullOrEmpty(limit.Category))
            return BadRequest("Category is required.");

        if (limit.MonthYear == default)
            return BadRequest("MonthYear is required.");

        limit.MonthYear = new DateTime(limit.MonthYear.Year, limit.MonthYear.Month, 1);

        if (limit.LastReset == null)
            limit.LastReset = DateTime.UtcNow;

        limit.NextReset = CalculateNextReset(limit.LastReset, limit.ResetFrequency);

        var existing = await _context.BudgetLimits
            .FirstOrDefaultAsync(b => b.Category == limit.Category && b.MonthYear.Year == limit.MonthYear.Year && b.MonthYear.Month == limit.MonthYear.Month);

        if (existing != null)
        {
            existing.LimitAmount = limit.LimitAmount;
            existing.ResetFrequency = limit.ResetFrequency;
            existing.LastReset = limit.LastReset;
            existing.NextReset = limit.NextReset;

            _context.BudgetLimits.Update(existing);
        }
        else
        {
            _context.BudgetLimits.Add(limit);
        }

        await _context.SaveChangesAsync();

        return Ok(limit);
    }

    // DELETE api/budgetlimits/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudgetLimit(int id)
    {
        var limit = await _context.BudgetLimits.FindAsync(id);
        if (limit == null)
        {
            return NotFound();
        }

        _context.BudgetLimits.Remove(limit);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
