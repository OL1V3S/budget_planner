using System.Security.Claims;
using BudgetPlanner.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BudgetPlanner.Controllers;

[ApiController]
[Authorize]
[Route("api/analytics")]
public sealed class AnalyticsController(ICashFlowService cashFlow) : ControllerBase
{
    [HttpGet("cash-flow")]
    public async Task<IActionResult> GetCashFlow(
        [FromQuery] string? month, [FromQuery] string? throughDate, CancellationToken cancellationToken)
    {
        var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ownerId is null) return Unauthorized();
        if (!CashFlowPeriod.TryCreate(month, throughDate, out var period))
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest, Title = "Cash-flow request failed",
                Detail = "Provide a calendar month and a through date on or after that month begins.",
                Type = "https://ordo.invalid/problems/cash_flow_period_invalid",
                Extensions = { ["code"] = "cash_flow_period_invalid" }
            });
        return Ok(await cashFlow.GetAsync(ownerId, period!, cancellationToken));
    }
}
