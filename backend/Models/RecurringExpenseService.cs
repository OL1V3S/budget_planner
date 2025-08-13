using System;
using System.Threading;
using System.Threading.Tasks;
using BudgetPlanner.Data;
using BudgetPlanner.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public class RecurringExpenseService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;

    public RecurringExpenseService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();

                // Get all recurring expenses
                var recurringExpenses = await context.Expenses
                    .Where(e => !string.IsNullOrEmpty(e.Recurrence))
                    .ToListAsync(stoppingToken);

                foreach (var expense in recurringExpenses)
                {
                    var lastDate = expense.Date;

                    var nextDate = expense.Recurrence switch
                    {
                        "Weekly" => lastDate.AddDays(7),
                        "Biweekly" => lastDate.AddDays(14),
                        "Monthly" => lastDate.AddMonths(1),
                        _ => (DateTime?)null
                    };

                    if (nextDate != null && nextDate <= DateTime.UtcNow.Date)
                    {
                        // Check if an expense with this description and date already exists to avoid duplicates
                        bool exists = await context.Expenses.AnyAsync(e =>
                            e.Description == expense.Description &&
                            e.Date == nextDate &&
                            e.Amount == expense.Amount, stoppingToken);

                        if (!exists)
                        {
                            var newExpense = new Expense
                            {
                                Description = expense.Description,
                                Amount = expense.Amount,
                                Date = nextDate.Value,
                                Category = expense.Category,
                                Recurrence = expense.Recurrence,
                                Recurring = true,
                            };

                            context.Expenses.Add(newExpense);
                        }
                    }
                }

                await context.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"RecurringExpenseService error: {ex.Message}");
            }

            // Run once every day (adjust as needed)
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
