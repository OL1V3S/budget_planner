using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BudgetPlanner.Data;
using BudgetPlanner.Models;

namespace BudgetPlanner.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetLimitsController : ControllerBase
{
    private readonly BudgetContext _context;

    public BudgetLimitsController(BudgetContext context)
    {
        _context = context;
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

        return Ok(limits);
    }

    // POST api/budgetlimits  (upsert by Category + MonthYear)
    [HttpPost]
    public async Task<ActionResult<BudgetLimit>> UpsertBudgetLimit(BudgetLimit limit)
    {
        if (string.IsNullOrWhiteSpace(limit.Category))
            return BadRequest("Category is required.");

        if (limit.MonthYear == default)
            return BadRequest("MonthYear is required.");

        // Normalize to first of month
        limit.MonthYear = new DateTime(limit.MonthYear.Year, limit.MonthYear.Month, 1);

        var existing = await _context.BudgetLimits
            .FirstOrDefaultAsync(b =>
                b.Category == limit.Category &&
                b.MonthYear.Year == limit.MonthYear.Year &&
                b.MonthYear.Month == limit.MonthYear.Month);

        if (existing != null)
        {
            existing.LimitAmount = limit.LimitAmount;
            _context.BudgetLimits.Update(existing);
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        _context.BudgetLimits.Add(limit);
        await _context.SaveChangesAsync();
        return Ok(limit);
    }

    // DELETE api/budgetlimits/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudgetLimit(int id)
    {
        var limit = await _context.BudgetLimits.FindAsync(id);
        if (limit == null) return NotFound();

        _context.BudgetLimits.Remove(limit);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
