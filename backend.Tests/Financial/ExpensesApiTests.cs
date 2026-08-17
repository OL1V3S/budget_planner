using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BudgetPlanner.Models;
using Xunit;

namespace BudgetPlanner.Tests.Financial;

[Collection("Environment variable tests")]
public sealed class ExpensesApiTests
{
    [Fact]
    public async Task Unauthenticated_request_is_rejected()
    {
        await using var app = new FinancialApiTestApplication();
        using var client = app.CreateTestClient();

        var response = await client.GetAsync("/api/expenses");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_returns_only_authenticated_users_expenses_with_current_shape()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");
        var owned = await app.SeedExpenseAsync(owner.Id, "owned", 12.34m, category: "Food");
        await app.SeedExpenseAsync(other.Id, "hidden", 98.76m, category: "Bills");

        var response = await owner.Client.GetAsync("/api/expenses");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var expense = Assert.Single(body.EnumerateArray());
        Assert.Equal(owned.Id, expense.GetProperty("id").GetInt32());
        Assert.Equal("owned", expense.GetProperty("description").GetString());
        Assert.Equal(12.34m, expense.GetProperty("amount").GetDecimal());
        Assert.Equal("Food", expense.GetProperty("category").GetString());
        Assert.Equal(owner.Id, expense.GetProperty("userId").GetString());
        Assert.Equal(JsonValueKind.Null, expense.GetProperty("user").ValueKind);
        Assert.True(expense.TryGetProperty("date", out _));
    }

    [Fact]
    public async Task Create_assigns_authenticated_owner_and_returns_current_response_shape()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");

        var response = await owner.Client.PostAsJsonAsync("/api/expenses", new
        {
            description = "new expense",
            amount = 42.25m,
            date = "2026-08-15T12:30:00",
            category = "food",
            userId = other.Id
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("new expense", body.GetProperty("description").GetString());
        Assert.Equal(42.25m, body.GetProperty("amount").GetDecimal());
        Assert.Equal("food", body.GetProperty("category").GetString());
        Assert.Equal(owner.Id, body.GetProperty("userId").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("user").ValueKind);
        Assert.NotNull(response.Headers.Location);

        var persisted = await app.FindExpenseAsync(body.GetProperty("id").GetInt32());
        Assert.NotNull(persisted);
        Assert.Equal(owner.Id, persisted.UserId);
        Assert.Equal(DateTimeKind.Utc, persisted.Date.Kind);
        Assert.Equal(new DateTime(2026, 8, 15, 12, 30, 0, DateTimeKind.Utc), persisted.Date);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-12.34")]
    public async Task Create_accepts_current_zero_and_negative_amount_behavior(string amountText)
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        var amount = decimal.Parse(amountText, System.Globalization.CultureInfo.InvariantCulture);

        var response = await owner.Client.PostAsJsonAsync("/api/expenses", new
        {
            description = "amount edge",
            amount,
            date = "2026-08-15",
            category = "food"
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(amount, body.GetProperty("amount").GetDecimal());
        var persisted = await app.FindExpenseAsync(body.GetProperty("id").GetInt32());
        Assert.NotNull(persisted);
        Assert.Equal(amount, persisted.Amount);
    }

    [Fact]
    public async Task Create_preserves_current_empty_description_and_category_values()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.PostAsJsonAsync("/api/expenses", new
        {
            description = "   ",
            amount = 1m,
            date = "2026-08-15",
            category = "  Food  "
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("   ", body.GetProperty("description").GetString());
        Assert.Equal("  Food  ", body.GetProperty("category").GetString());
    }

    [Fact]
    public async Task Put_rejects_route_and_body_id_mismatch_before_lookup()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.PutAsJsonAsync("/api/expenses/123", new
        {
            id = 456,
            description = "mismatch",
            amount = 1m,
            date = "2026-08-15",
            category = "food"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Expense ID mismatch", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Put_updates_owned_expense_and_preserves_current_values()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        var expense = await app.SeedExpenseAsync(owner.Id);

        var response = await owner.Client.PutAsJsonAsync($"/api/expenses/{expense.Id}", new
        {
            id = expense.Id,
            description = "  Updated  ",
            amount = -4.50m,
            date = "2026-09-03T09:45:00",
            category = " FOOD "
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var persisted = await app.FindExpenseAsync(expense.Id);
        Assert.NotNull(persisted);
        Assert.Equal("  Updated  ", persisted.Description);
        Assert.Equal(-4.50m, persisted.Amount);
        Assert.Equal(" FOOD ", persisted.Category);
        Assert.Equal(owner.Id, persisted.UserId);
        Assert.Equal(DateTimeKind.Utc, persisted.Date.Kind);
        Assert.Equal(new DateTime(2026, 9, 3, 9, 45, 0, DateTimeKind.Utc), persisted.Date);
    }

    [Fact]
    public async Task Put_of_another_users_expense_returns_not_found_and_does_not_change_it()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");
        var expense = await app.SeedExpenseAsync(other.Id, "protected");

        var response = await owner.Client.PutAsJsonAsync($"/api/expenses/{expense.Id}", new
        {
            id = expense.Id,
            description = "changed",
            amount = 99m,
            date = "2026-08-15",
            category = "other"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var persisted = await app.FindExpenseAsync(expense.Id);
        Assert.NotNull(persisted);
        Assert.Equal("protected", persisted.Description);
        Assert.Equal(other.Id, persisted.UserId);
    }

    [Fact]
    public async Task Put_of_missing_expense_returns_not_found()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.PutAsJsonAsync("/api/expenses/404", new
        {
            id = 404,
            description = "missing",
            amount = 1m,
            date = "2026-08-15",
            category = "food"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_removes_owned_expense()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        var expense = await app.SeedExpenseAsync(owner.Id);

        var response = await owner.Client.DeleteAsync($"/api/expenses/{expense.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Null(await app.FindExpenseAsync(expense.Id));
    }

    [Fact]
    public async Task Delete_of_another_users_expense_returns_not_found_and_preserves_it()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");
        var expense = await app.SeedExpenseAsync(other.Id);

        var response = await owner.Client.DeleteAsync($"/api/expenses/{expense.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotNull(await app.FindExpenseAsync(expense.Id));
    }

    [Fact]
    public async Task Delete_of_missing_expense_returns_not_found()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.DeleteAsync("/api/expenses/404");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
