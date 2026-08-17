using BudgetPlanner.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BudgetPlanner.Tests.Financial;

internal sealed class PostgreSqlFinancialApiTestApplication
    : FinancialApiTestApplicationBase
{
    public const string ConnectionEnvironmentVariable =
        "BUDGETPLANNER_POSTGRESQL_TEST_CONNECTION";

    private readonly string _connectionString;

    public PostgreSqlFinancialApiTestApplication()
    {
        _connectionString = Environment.GetEnvironmentVariable(ConnectionEnvironmentVariable)
            ?? throw new InvalidOperationException(
                $"Set {ConnectionEnvironmentVariable} to an isolated PostgreSQL test database connection string.");
    }

    protected override void ConfigureDatabase(IServiceCollection services)
    {
        services.AddDbContext<BudgetContext>(options =>
            options.UseNpgsql(_connectionString));
    }

    protected override void InitializeDatabase(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();

        context.Database.EnsureDeleted();
        context.Database.Migrate();
    }

    public async Task<IReadOnlyList<string>> GetAppliedMigrationsAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        return (await context.Database.GetAppliedMigrationsAsync()).ToList();
    }

    public IReadOnlyList<string> GetDefinedMigrations()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        return context.Database.GetMigrations().ToList();
    }
}
