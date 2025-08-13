using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNextResetToBudgetLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AmountSpent",
                table: "BudgetLimits",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextReset",
                table: "BudgetLimits",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceDays",
                table: "BudgetLimits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UsedPercentage",
                table: "BudgetLimits",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AmountSpent",
                table: "BudgetLimits");

            migrationBuilder.DropColumn(
                name: "NextReset",
                table: "BudgetLimits");

            migrationBuilder.DropColumn(
                name: "RecurrenceDays",
                table: "BudgetLimits");

            migrationBuilder.DropColumn(
                name: "UsedPercentage",
                table: "BudgetLimits");
        }
    }
}
