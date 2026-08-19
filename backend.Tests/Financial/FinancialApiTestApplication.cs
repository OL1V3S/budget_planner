using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BudgetPlanner.Data;
using BudgetPlanner.Models;
using BudgetPlanner.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace BudgetPlanner.Tests.Financial;

internal sealed class FinancialApiTestApplication : FinancialApiTestApplicationBase
{
    private readonly string _databaseName = $"financial-api-tests-{Guid.NewGuid()}";

    protected override void ConfigureDatabase(IServiceCollection services)
    {
        services.AddDbContext<BudgetContext>(options =>
            options.UseInMemoryDatabase(_databaseName));
    }
}

internal abstract class FinancialApiTestApplicationBase : WebApplicationFactory<Program>
{
    protected const string TestPassword = "Password1!";
    protected const string TestJwtKey =
        "test-only-signing-key-that-is-at-least-thirty-two-bytes-long";
    private static readonly object HostStartupLock = new();
    private bool _hostStarted;

    protected abstract void ConfigureDatabase(IServiceCollection services);

    protected virtual void InitializeDatabase(IServiceProvider services) { }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<BudgetContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<BudgetContext>>();
            ConfigureDatabase(services);

            services.RemoveAll<IEmailService>();
            services.AddSingleton<IEmailService, NoOpEmailService>();
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.ConfigureAppConfiguration(configuration =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=unused-by-tests",
                ["Jwt:Key"] = TestJwtKey,
                ["EmailSettings:FromName"] = "Budget Planner Tests",
                ["EmailSettings:FromEmail"] = "sender@example.com",
                ["GoogleEmail:ClientId"] = "test-client-id",
                ["GoogleEmail:ClientSecret"] = "test-client-secret",
                ["GoogleEmail:RefreshToken"] = "test-refresh-token",
                ["Frontend:BaseUrl"] = "https://frontend.test"
            }));

        return base.CreateHost(builder);
    }

    public async Task<TestUser> CreateAuthenticatedUserAsync(string email)
    {
        EnsureHostStarted();
        using var scope = Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser { UserName = email, Email = email };
        var createResult = await userManager.CreateAsync(user, TestPassword);
        EnsureSucceeded(createResult, "create test user");

        var confirmationToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var confirmationResult = await userManager.ConfirmEmailAsync(user, confirmationToken);
        EnsureSucceeded(confirmationResult, "confirm test user");

        var loginClient = CreateClient();
        var loginResponse = await loginClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = TestPassword });
        loginResponse.EnsureSuccessStatusCode();
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginBody.GetProperty("token").GetString()
            ?? throw new InvalidOperationException("Login response did not contain a token.");

        var authenticatedClient = CreateClient();
        authenticatedClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        loginClient.Dispose();

        return new TestUser(user.Id, authenticatedClient);
    }

    public HttpClient CreateTestClient()
    {
        EnsureHostStarted();
        return CreateClient();
    }

    public async Task<Expense> SeedExpenseAsync(
        string userId,
        string description = "seeded expense",
        decimal amount = 12.34m,
        DateOnly? date = null,
        string category = "food")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        var expense = new Expense
        {
            UserId = userId,
            Description = description,
            Amount = amount,
            Date = date ?? new DateOnly(2026, 8, 12),
            Category = category
        };
        context.Expenses.Add(expense);
        await context.SaveChangesAsync();
        return expense;
    }

    public async Task<BudgetLimit> SeedBudgetLimitAsync(
        string userId,
        string category = "food",
        decimal limitAmount = 100m,
        DateTime? monthYear = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        var limit = new BudgetLimit
        {
            UserId = userId,
            Category = category,
            LimitAmount = limitAmount,
            MonthYear = monthYear ?? new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        context.BudgetLimits.Add(limit);
        await context.SaveChangesAsync();
        return limit;
    }

    public async Task<Expense?> FindExpenseAsync(int id)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        return await context.Expenses.AsNoTracking().SingleOrDefaultAsync(expense => expense.Id == id);
    }

    public async Task<IReadOnlyList<BudgetLimit>> FindBudgetLimitsAsync(
        string userId,
        string category)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
        return await context.BudgetLimits
            .AsNoTracking()
            .Where(limit => limit.UserId == userId && limit.Category == category)
            .OrderBy(limit => limit.Id)
            .ToListAsync();
    }

    private static void EnsureSucceeded(IdentityResult result, string operation)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Unable to {operation}: {string.Join(", ", result.Errors.Select(error => error.Description))}");
        }
    }

    private void EnsureHostStarted()
    {
        if (_hostStarted)
            return;

        lock (HostStartupLock)
        {
            if (_hostStarted)
                return;

            var originalJwtKey = Environment.GetEnvironmentVariable("Jwt__Key");
            try
            {
                Environment.SetEnvironmentVariable("Jwt__Key", TestJwtKey);
                InitializeDatabase(Services);
                _hostStarted = true;
            }
            finally
            {
                Environment.SetEnvironmentVariable("Jwt__Key", originalJwtKey);
            }
        }
    }
}

internal sealed record TestUser(string Id, HttpClient Client) : IDisposable
{
    public void Dispose() => Client.Dispose();
}

internal sealed class NoOpEmailService : IEmailService
{
    public Task SendEmailAsync(
        string toEmail,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default) => Task.CompletedTask;
}
