using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BudgetPlanner.Data;
using BudgetPlanner.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BudgetPlanner.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BudgetLimitsController : ControllerBase
{
    private readonly BudgetContext _context;

    public BudgetLimitsController(BudgetContext context)
    {
        _context = context;
    }

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BudgetLimit>>> GetBudgetLimits([FromQuery] string monthYear)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrEmpty(monthYear))
        {
            return BadRequest("monthYear query parameter is required.");
        }

        if (!DateTime.TryParse($"{monthYear}-01", out var monthYearDate))
        {
            return BadRequest("Invalid monthYear format. Expected format: YYYY-MM");
        }

        // 🔥 FIX: force UTC
        monthYearDate = DateTime.SpecifyKind(monthYearDate, DateTimeKind.Utc);

        var limits = await _context.BudgetLimits
            .Where(b =>
                b.UserId == userId &&
                b.MonthYear.Year == monthYearDate.Year &&
                b.MonthYear.Month == monthYearDate.Month)
            .ToListAsync();

        return Ok(limits);
    }

    [HttpPost]
    public async Task<ActionResult<BudgetLimit>> UpsertBudgetLimit(BudgetLimit limit)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(limit.Category))
        {
            return BadRequest("Category is required.");
        }

        if (limit.MonthYear == default)
        {
            return BadRequest("MonthYear is required.");
        }

        limit.UserId = userId;

        // 🔥 FIX: normalize + force UTC
        limit.MonthYear = DateTime.SpecifyKind(
            new DateTime(limit.MonthYear.Year, limit.MonthYear.Month, 1),
            DateTimeKind.Utc
        );

        var existing = await _context.BudgetLimits
            .FirstOrDefaultAsync(b =>
                b.UserId == userId &&
                b.Category == limit.Category &&
                b.MonthYear.Year == limit.MonthYear.Year &&
                b.MonthYear.Month == limit.MonthYear.Month);

        if (existing != null)
        {
            existing.LimitAmount = limit.LimitAmount;
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        _context.BudgetLimits.Add(limit);
        await _context.SaveChangesAsync();

        return Ok(limit);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudgetLimit(int id)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var limit = await _context.BudgetLimits
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (limit == null)
        {
            return NotFound();
        }

        _context.BudgetLimits.Remove(limit);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}