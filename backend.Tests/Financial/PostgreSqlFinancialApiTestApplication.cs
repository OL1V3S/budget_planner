using BudgetPlanner.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

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

        ValidateDestructiveDatabaseConnection(_connectionString);
    }

    internal static void ValidateDestructiveDatabaseConnection(string connectionString)
    {
        NpgsqlConnectionStringBuilder connection;

        try
        {
            connection = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (ArgumentException exception)
        {
            throw new InvalidOperationException(
                "PostgreSQL integration tests only operate on explicitly designated local disposable databases.",
                exception);
        }

        var isLocalHost = string.Equals(
                connection.Host,
                "localhost",
                StringComparison.OrdinalIgnoreCase)
            || connection.Host == "127.0.0.1"
            || connection.Host == "::1";
        var isDisposableDatabase = connection.Database == "budget_planner_ci"
            || connection.Database?.StartsWith(
                "budget_planner_test_",
                StringComparison.Ordinal) == true;

        if (!isLocalHost || !isDisposableDatabase)
        {
            throw new InvalidOperationException(
                "PostgreSQL integration tests only operate on explicitly designated local disposable databases. "
                + "Use localhost, 127.0.0.1, or ::1 with database budget_planner_ci or a database whose name starts with budget_planner_test_.");
        }
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
