using System.Security.Claims;
using System.Text.RegularExpressions;
using BudgetPlanner.Contracts.Expenses;
using BudgetPlanner.Data;
using BudgetPlanner.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BudgetPlanner.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private const decimal MaxExpenseAmount = 9999999999999999.99m;
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
    public async Task<ActionResult<IEnumerable<ExpenseResponse>>> GetExpenses()
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var expenses = await _context.Expenses
            .Where(e => e.UserId == userId)
            .ToListAsync();

        return expenses.Select(ToResponse).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseResponse>> PostExpense(CreateExpenseRequest request)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        if (!TryValidateAndNormalize(
                request.Description,
                request.Amount,
                request.Category,
                out var description,
                out var category))
        {
            return ValidationProblem(ModelState);
        }

        var expense = new Expense
        {
            UserId = userId,
            Description = description,
            Amount = request.Amount,
            Date = request.Date,
            Category = category
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetExpenses),
            new { id = expense.Id },
            ToResponse(expense));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutExpense(int id, UpdateExpenseRequest request)
    {
        var userId = GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        if (id != request.Id)
        {
            return BadRequest("Expense ID mismatch");
        }

        var existingExpense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (existingExpense == null)
        {
            return NotFound();
        }

        if (!TryValidateAndNormalize(
                request.Description,
                request.Amount,
                request.Category,
                out var description,
                out var category))
        {
            return ValidationProblem(ModelState);
        }

        existingExpense.Description = description;
        existingExpense.Amount = request.Amount;
        existingExpense.Date = request.Date;
        existingExpense.Category = category;

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

    private bool TryValidateAndNormalize(
        string? description,
        decimal amount,
        string? category,
        out string normalizedDescription,
        out string normalizedCategory)
    {
        normalizedDescription = (description ?? string.Empty).Trim();
        normalizedCategory = NormalizeCategory(category);

        if (amount <= 0m)
        {
            ModelState.AddModelError("amount", "Amount must be greater than zero.");
        }

        if (amount > MaxExpenseAmount)
        {
            ModelState.AddModelError("amount", "Amount exceeds the supported monetary range.");
        }

        if (decimal.Round(amount, 2) != amount)
        {
            ModelState.AddModelError("amount", "Amount must have at most two decimal places.");
        }

        if (string.IsNullOrWhiteSpace(normalizedDescription))
        {
            ModelState.AddModelError("description", "Description is required.");
        }
        else if (normalizedDescription.Length > 500)
        {
            ModelState.AddModelError("description", "Description must be 500 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(normalizedCategory))
        {
            ModelState.AddModelError("category", "Category is required.");
        }
        else if (normalizedCategory.Length > 100)
        {
            ModelState.AddModelError("category", "Category must be 100 characters or fewer.");
        }
        else if (normalizedCategory == "other")
        {
            ModelState.AddModelError(
                "category",
                "Category 'other' is reserved for the UI custom-category selector.");
        }

        return ModelState.IsValid;
    }

    private static string NormalizeCategory(string? category)
    {
        var trimmed = (category ?? string.Empty).Trim();
        return Regex.Replace(trimmed, @"\s+", " ").ToLowerInvariant();
    }

    private static ExpenseResponse ToResponse(Expense expense)
    {
        return new ExpenseResponse(
            expense.Id,
            expense.Description,
            expense.Amount,
            expense.Date,
            expense.Category);
    }
}
