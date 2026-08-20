using System.Security.Claims;
using BudgetPlanner.Contracts.ImportPreviews;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BudgetPlanner.Import;

public sealed class ImportPreviewAdmissionFilter(IImportPreviewAdmission admission) : IAsyncResourceFilter
{
    public async Task OnResourceExecutionAsync(
        ResourceExecutingContext context,
        ResourceExecutionDelegate next)
    {
        var userId = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        using var lease = admission.TryAcquire(userId);
        if (lease is null)
        {
            context.Result = new ConflictObjectResult(new ImportPreviewError(
                "import_in_progress",
                "Another statement is already being processed."));
            return;
        }

        await next();
    }
}
