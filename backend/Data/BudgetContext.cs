using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using BudgetPlanner.Models;

namespace BudgetPlanner.Data;

public class BudgetContext : IdentityDbContext<ApplicationUser>, IDataProtectionKeyContext
{
    public BudgetContext(DbContextOptions<BudgetContext> options) : base(options) {}

    public DbSet<Expense> Expenses { get; set; }
    public DbSet<BudgetLimit> BudgetLimits { get; set; }
    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Expense>()
            .Property(e => e.Amount)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Expense>()
            .Property(e => e.Date)
            .HasColumnType("date");

        modelBuilder.Entity<BudgetLimit>()
            .Property(b => b.LimitAmount)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BudgetLimit>()
            .HasOne(b => b.User)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
