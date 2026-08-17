using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BudgetPlanner.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BudgetPlanner.Tests.Financial;

[Collection("Environment variable tests")]
[Trait("Category", "PostgreSQL")]
public sealed class PostgreSqlFinancialApiTests
{
    [PostgreSqlFact]
    public async Task Migration_chain_applies_to_empty_database_and_supports_identity()
    {
        await using var app = new PostgreSqlFinancialApiTestApplication();
        using var user = await app.CreateAuthenticatedUserAsync("migration@example.com");

        var definedMigrations = app.GetDefinedMigrations();
        var appliedMigrations = await app.GetAppliedMigrationsAsync();

        Assert.NotEmpty(definedMigrations);
        Assert.Equal(definedMigrations, appliedMigrations);

        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", context.Database.ProviderName);
        Assert.True(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
        Assert.False((await context.Database.GetPendingMigrationsAsync()).Any());
    }

    [PostgreSqlFact]
    public async Task Expense_crud_persists_current_values_and_enforces_user_isolation()
    {
        await using var app = new PostgreSqlFinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("expense-owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("expense-other@example.com");

        var createResponse = await owner.Client.PostAsJsonAsync("/api/expenses", new
        {
            description = "postgres expense",
            amount = 123.456m,
            date = "2026-08-15T12:30:00",
            category = "Food"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.Equal(123.456m, created.GetProperty("amount").GetDecimal());
        var id = created.GetProperty("id").GetInt32();

        var read = await owner.Client.GetFromJsonAsync<JsonElement>("/api/expenses");
        var readExpense = Assert.Single(read.EnumerateArray());
        Assert.Equal(id, readExpense.GetProperty("id").GetInt32());
        Assert.Equal(123.46m, readExpense.GetProperty("amount").GetDecimal());

        var forbiddenUpdate = await other.Client.PutAsJsonAsync($"/api/expenses/{id}", new
        {
            id,
            description = "not allowed",
            amount = 1m,
            date = "2026-08-16",
            category = "other"
        });
        Assert.Equal(HttpStatusCode.NotFound, forbiddenUpdate.StatusCode);

        var updateResponse = await owner.Client.PutAsJsonAsync($"/api/expenses/{id}", new
        {
            id,
            description = "updated postgres expense",
            amount = -4.50m,
            date = "2026-09-03T09:45:00",
            category = " FOOD "
        });
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var persisted = await app.FindExpenseAsync(id);
        Assert.NotNull(persisted);
        Assert.Equal(-4.50m, persisted.Amount);
        Assert.Equal(new DateTime(2026, 9, 3, 9, 45, 0, DateTimeKind.Utc), persisted.Date);
        Assert.Equal(" FOOD ", persisted.Category);

        var deleteResponse = await owner.Client.DeleteAsync($"/api/expenses/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Null(await app.FindExpenseAsync(id));
    }

    [PostgreSqlFact]
    public async Task Budget_create_read_upsert_and_delete_use_relational_month_query()
    {
        await using var app = new PostgreSqlFinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("budget-owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("budget-other@example.com");

        var createResponse = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "food",
            limitAmount = 125.505m,
            monthYear = "2026-08-23T14:30:00"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        Assert.Equal(125.505m, created.GetProperty("limitAmount").GetDecimal());
        var id = created.GetProperty("id").GetInt32();

        await app.SeedBudgetLimitAsync(other.Id, "hidden", 999m);
        var read = await owner.Client.GetFromJsonAsync<JsonElement>(
            "/api/budgetlimits?monthYear=2026-08");
        var readLimit = Assert.Single(read.EnumerateArray());
        Assert.Equal(id, readLimit.GetProperty("id").GetInt32());
        Assert.Equal(125.51m, readLimit.GetProperty("limitAmount").GetDecimal());

        var upsertResponse = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "food",
            limitAmount = 250m,
            monthYear = "2026-08-31"
        });
        var upserted = await upsertResponse.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, upsertResponse.StatusCode);
        Assert.Equal(id, upserted.GetProperty("id").GetInt32());
        var limits = await app.FindBudgetLimitsAsync(owner.Id, "food");
        var persisted = Assert.Single(limits);
        Assert.Equal(250m, persisted.LimitAmount);
        Assert.Equal(new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc), persisted.MonthYear);

        var deleteResponse = await owner.Client.DeleteAsync($"/api/budgetlimits/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Empty(await app.FindBudgetLimitsAsync(owner.Id, "food"));
        Assert.Single(await app.FindBudgetLimitsAsync(other.Id, "hidden"));
    }
}

internal sealed class PostgreSqlFactAttribute : FactAttribute
{
    public PostgreSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(
            PostgreSqlFinancialApiTestApplication.ConnectionEnvironmentVariable)))
        {
            Skip = $"Set {PostgreSqlFinancialApiTestApplication.ConnectionEnvironmentVariable} to run PostgreSQL integration tests.";
        }
    }
}
