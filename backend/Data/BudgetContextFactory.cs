using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BudgetPlanner.Data;

public sealed class BudgetContextFactory : IDesignTimeDbContextFactory<BudgetContext>
{
    public const string MigrationConnectionEnvironmentVariable =
        "BUDGETPLANNER_MIGRATION_CONNECTION";

    public BudgetContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable(
            MigrationConnectionEnvironmentVariable);

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Set {MigrationConnectionEnvironmentVariable} to a PostgreSQL connection string before running migration commands.");
        }

        var options = new DbContextOptionsBuilder<BudgetContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new BudgetContext(options);
    }
}
