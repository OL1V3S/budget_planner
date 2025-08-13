using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Threading;
using System.Threading.Tasks;
using BudgetPlanner.Data;

namespace BudgetPlanner.Models
{
    public class BudgetResetService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;

        public BudgetResetService(IServiceProvider serviceProvider)
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
                    var now = DateTime.UtcNow;

                    var budgetLimits = await context.BudgetLimits.ToListAsync(stoppingToken);

                    foreach (var limit in budgetLimits)
                    {
                        if (string.IsNullOrEmpty(limit.ResetFrequency) || limit.ResetFrequency == "None")
                            continue;

                        if (!limit.LastReset.HasValue)
                        {
                            limit.LastReset = now;
                            context.BudgetLimits.Update(limit);
                        }

                        var elapsedDays = (now - (limit.LastReset ?? now)).TotalDays;
                        bool resetNeeded = false;

                        if (limit.RecurrenceDays.HasValue && limit.RecurrenceDays.Value > 0)
                        {
                            resetNeeded = elapsedDays >= limit.RecurrenceDays.Value;
                        }
                        else
                        {
                            switch (limit.ResetFrequency)
                            {
                                case "Weekly":
                                    resetNeeded = elapsedDays >= 7;
                                    break;
                                case "Biweekly":
                                    resetNeeded = elapsedDays >= 14;
                                    break;
                                case "Monthly":
                                    resetNeeded = elapsedDays >= 30;
                                    break;
                            }
                        }

                        if (resetNeeded)
                        {
                            limit.AmountSpent = 0m;
                            limit.LastReset = now;
                        }

                        if (limit.LimitAmount > 0)
                        {
                            limit.UsedPercentage = limit.AmountSpent / limit.LimitAmount * 100;
                        }
                        else
                        {
                            limit.UsedPercentage = 0;
                        }

                        context.BudgetLimits.Update(limit);
                    }

                    await context.SaveChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"BudgetResetService error: {ex.Message}");
                }

                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}
