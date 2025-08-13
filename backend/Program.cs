using BudgetPlanner.Data;
using Microsoft.EntityFrameworkCore;
using BudgetPlanner.Models;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();

builder.Services.AddDbContext<BudgetContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHostedService<BudgetResetService>();
builder.Services.AddHostedService<RecurringExpenseService>();



var app = builder.Build();

app.UseCors();
app.MapControllers();

app.Run();
