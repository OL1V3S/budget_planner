using Microsoft.EntityFrameworkCore;
using BudgetPlanner.Models;

namespace BudgetPlanner.Data;

public class BudgetContext : DbContext
{
    public BudgetContext(DbContextOptions<BudgetContext> options) : base(options) {}

    public DbSet<Expense> Expenses { get; set; }
    public DbSet<BudgetLimit> BudgetLimits { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Expense>()
            .Property(e => e.Amount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BudgetLimit>()
            .Property(b => b.LimitAmount)
            .HasPrecision(18, 2);  // add this line

        base.OnModelCreating(modelBuilder);
    }

}
