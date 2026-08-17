using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace BudgetPlanner.Tests.Financial;

[Collection("Environment variable tests")]
public sealed class BudgetLimitsApiTests
{
    [Fact]
    public async Task Unauthenticated_request_is_rejected()
    {
        await using var app = new FinancialApiTestApplication();
        using var client = app.CreateTestClient();

        var response = await client.GetAsync("/api/budgetlimits?monthYear=2026-08");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_requires_month_year()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.GetAsync("/api/budgetlimits");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("One or more validation errors occurred.", body.GetProperty("title").GetString());
        Assert.Equal(400, body.GetProperty("status").GetInt32());
        var monthYearErrors = body.GetProperty("errors").GetProperty("monthYear");
        Assert.Contains(
            "The monthYear field is required.",
            monthYearErrors.EnumerateArray().Select(error => error.GetString()));
    }

    [Fact]
    public async Task Get_rejects_invalid_month_year()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.GetAsync("/api/budgetlimits?monthYear=not-a-month");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "Invalid monthYear format. Expected format: YYYY-MM",
            await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Get_scopes_limits_to_authenticated_user_and_requested_month()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");
        var august = await app.SeedBudgetLimitAsync(owner.Id, "food", 100m);
        await app.SeedBudgetLimitAsync(
            owner.Id,
            "bills",
            200m,
            new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc));
        await app.SeedBudgetLimitAsync(other.Id, "transport", 300m);

        var response = await owner.Client.GetAsync("/api/budgetlimits?monthYear=2026-08");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var limit = Assert.Single(body.EnumerateArray());
        Assert.Equal(august.Id, limit.GetProperty("id").GetInt32());
        Assert.Equal("food", limit.GetProperty("category").GetString());
        Assert.Equal(100m, limit.GetProperty("limitAmount").GetDecimal());
        Assert.Equal(owner.Id, limit.GetProperty("userId").GetString());
        Assert.Equal(JsonValueKind.Null, limit.GetProperty("user").ValueKind);
        Assert.True(limit.TryGetProperty("monthYear", out _));
    }

    [Fact]
    public async Task Create_assigns_owner_and_normalizes_month_to_first_day_utc()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");

        var response = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "food",
            limitAmount = 125.50m,
            monthYear = "2026-08-23T14:30:00",
            userId = other.Id
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(owner.Id, body.GetProperty("userId").GetString());
        Assert.Equal("food", body.GetProperty("category").GetString());
        Assert.Equal(125.50m, body.GetProperty("limitAmount").GetDecimal());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("user").ValueKind);

        var limits = await app.FindBudgetLimitsAsync(owner.Id, "food");
        var persisted = Assert.Single(limits);
        Assert.Equal(new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc), persisted.MonthYear);
        Assert.Equal(DateTimeKind.Utc, persisted.MonthYear.Kind);
    }

    [Fact]
    public async Task Same_user_category_and_month_updates_existing_limit()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        var existing = await app.SeedBudgetLimitAsync(owner.Id, "food", 100m);

        var response = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "food",
            limitAmount = 250m,
            monthYear = "2026-08-31"
        });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(existing.Id, body.GetProperty("id").GetInt32());
        Assert.Equal(250m, body.GetProperty("limitAmount").GetDecimal());
        var limits = await app.FindBudgetLimitsAsync(owner.Id, "food");
        Assert.Equal(250m, Assert.Single(limits).LimitAmount);
    }

    [Fact]
    public async Task Category_matching_is_case_and_whitespace_sensitive()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        await app.SeedBudgetLimitAsync(owner.Id, "food", 100m);

        foreach (var category in new[] { "Food", " food " })
        {
            var response = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
            {
                category,
                limitAmount = 200m,
                monthYear = "2026-08-15"
            });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        Assert.Single(await app.FindBudgetLimitsAsync(owner.Id, "food"));
        Assert.Single(await app.FindBudgetLimitsAsync(owner.Id, "Food"));
        Assert.Single(await app.FindBudgetLimitsAsync(owner.Id, " food "));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-75.25")]
    public async Task Create_accepts_current_zero_and_negative_limit_amounts(string amountText)
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        var amount = decimal.Parse(amountText, System.Globalization.CultureInfo.InvariantCulture);

        var response = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = $"edge-{amountText}",
            limitAmount = amount,
            monthYear = "2026-08-15"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var limits = await app.FindBudgetLimitsAsync(owner.Id, $"edge-{amountText}");
        Assert.Equal(amount, Assert.Single(limits).LimitAmount);
    }

    [Fact]
    public async Task Whitespace_only_category_is_rejected_but_other_category_text_is_preserved()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var rejected = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "   ",
            limitAmount = 100m,
            monthYear = "2026-08-15"
        });
        var preserved = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "  Food  ",
            limitAmount = 100m,
            monthYear = "2026-08-15"
        });

        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        Assert.Equal("Category is required.", await rejected.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, preserved.StatusCode);
        Assert.Single(await app.FindBudgetLimitsAsync(owner.Id, "  Food  "));
    }

    [Fact]
    public async Task Seeded_duplicate_limits_are_both_returned_and_upsert_updates_only_one()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        await app.SeedBudgetLimitAsync(owner.Id, "food", 100m);
        await app.SeedBudgetLimitAsync(owner.Id, "food", 150m);

        var before = await owner.Client.GetFromJsonAsync<JsonElement>(
            "/api/budgetlimits?monthYear=2026-08");
        Assert.Equal(2, before.GetArrayLength());

        var response = await owner.Client.PostAsJsonAsync("/api/budgetlimits", new
        {
            category = "food",
            limitAmount = 300m,
            monthYear = "2026-08-15"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var persisted = await app.FindBudgetLimitsAsync(owner.Id, "food");
        Assert.Equal(2, persisted.Count);
        Assert.Single(persisted, limit => limit.LimitAmount == 300m);
        Assert.Single(persisted, limit => limit.LimitAmount is 100m or 150m);
    }

    [Fact]
    public async Task Delete_removes_owned_limit()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        var limit = await app.SeedBudgetLimitAsync(owner.Id);

        var response = await owner.Client.DeleteAsync($"/api/budgetlimits/{limit.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await app.FindBudgetLimitsAsync(owner.Id, limit.Category));
    }

    [Fact]
    public async Task Delete_of_another_users_limit_returns_not_found_and_preserves_it()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");
        using var other = await app.CreateAuthenticatedUserAsync("other@example.com");
        var limit = await app.SeedBudgetLimitAsync(other.Id);

        var response = await owner.Client.DeleteAsync($"/api/budgetlimits/{limit.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Single(await app.FindBudgetLimitsAsync(other.Id, limit.Category));
    }

    [Fact]
    public async Task Delete_of_missing_limit_returns_not_found()
    {
        await using var app = new FinancialApiTestApplication();
        using var owner = await app.CreateAuthenticatedUserAsync("owner@example.com");

        var response = await owner.Client.DeleteAsync("/api/budgetlimits/404");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
