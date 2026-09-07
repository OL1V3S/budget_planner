using System.Data;
using BudgetPlanner.Contracts.Analytics;
using BudgetPlanner.Data;
using Microsoft.EntityFrameworkCore;

namespace BudgetPlanner.Analytics;

public interface ICashFlowService
{
    Task<CashFlowResponse> GetAsync(string ownerId, CashFlowPeriod period, CancellationToken cancellationToken);
}

public sealed class CashFlowService(BudgetContext context) : ICashFlowService
{
    public async Task<CashFlowResponse> GetAsync(
        string ownerId, CashFlowPeriod period, CancellationToken cancellationToken)
    {
        await using var transaction = context.Database.IsRelational()
            ? await context.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken)
            : null;
        if (context.Database.IsNpgsql())
            await context.Database.ExecuteSqlRawAsync("SET TRANSACTION READ ONLY", cancellationToken);

        // This first data read establishes the PostgreSQL snapshot used by every
        // subsequent query, including the selectable-month metadata.
        var inflows = await context.AccountInflows.AsNoTracking().TagWith("CashFlow:inflows")
            .Where(value => value.OwnerId == ownerId
                && value.Date >= period.TrendFrom && value.Date <= period.To)
            .Select(value => new CashFlowInflowRow(value.Id, value.Date, value.Amount, value.PaycheckEvidenceRevision))
            .ToListAsync(cancellationToken);
        var expenses = await context.Expenses.AsNoTracking().TagWith("CashFlow:expenses")
            .Where(value => value.UserId == ownerId
                && value.Date >= period.TrendFrom && value.Date <= period.To)
            .Select(value => new CashFlowExpenseRow(value.Id, value.Date, value.Amount, value.Category))
            .ToListAsync(cancellationToken);
        var memberships = await (
            from occurrence in context.PaycheckOccurrences.AsNoTracking()
            join profile in context.PaycheckProfiles.AsNoTracking() on occurrence.PaycheckProfileId equals profile.Id
            join inflow in context.AccountInflows.AsNoTracking() on occurrence.AccountInflowId equals inflow.Id
            where occurrence.OwnerId == ownerId && profile.OwnerId == ownerId && inflow.OwnerId == ownerId
                && inflow.Date >= period.TrendFrom && inflow.Date <= period.To
            select new CashFlowMembershipRow(inflow.Id, profile.Id, occurrence.EvidenceRevisionAtAssignment))
            .TagWith("CashFlow:memberships").ToListAsync(cancellationToken);
        var availableDates = await context.AccountInflows.AsNoTracking()
            .Where(value => value.OwnerId == ownerId && value.Date <= period.ThroughDate)
            .Select(value => value.Date)
            .Union(context.Expenses.AsNoTracking()
                .Where(value => value.UserId == ownerId && value.Date <= period.ThroughDate)
                .Select(value => value.Date))
            .TagWith("CashFlow:months").ToListAsync(cancellationToken);

        var response = CashFlowAggregation.Aggregate(period, inflows, expenses, memberships, availableDates);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return response;
    }
}
