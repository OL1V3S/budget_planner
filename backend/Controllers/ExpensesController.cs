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
public class ExpensesController : ControllerBase
{
    private readonly BudgetContext _context;

    public ExpensesController(BudgetContext context)
    {
        _context = context;
    }

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses()
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        return await _context.Expenses
            .Where(e => e.UserId == userId)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> PostExpense(Expense expense)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        expense.UserId = userId;

        // 🔥 FIX: ensure UTC for PostgreSQL
        expense.Date = DateTime.SpecifyKind(expense.Date, DateTimeKind.Utc);

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetExpenses), new { id = expense.Id }, expense);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutExpense(int id, Expense updatedExpense)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        if (id != updatedExpense.Id)
        {
            return BadRequest("Expense ID mismatch");
        }

        var existingExpense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (existingExpense == null)
        {
            return NotFound();
        }

        existingExpense.Description = updatedExpense.Description;
        existingExpense.Amount = updatedExpense.Amount;

        // 🔥 FIX: ensure UTC here too
        existingExpense.Date = DateTime.SpecifyKind(updatedExpense.Date, DateTimeKind.Utc);

        existingExpense.Category = updatedExpense.Category;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense == null)
        {
            return NotFound();
        }

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}