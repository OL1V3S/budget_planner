using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class PreparePaycheckRecordedReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PaycheckOccurrence_Kind",
                table: "PaycheckOccurrences");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PaycheckOccurrence_TimingOffset",
                table: "PaycheckOccurrences");

            migrationBuilder.CreateIndex(
                name: "UX_PaycheckOccurrences_Profile_Slot",
                table: "PaycheckOccurrences",
                columns: new[] { "PaycheckProfileId", "SlotAnchor" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaycheckOccurrence_Kind",
                table: "PaycheckOccurrences",
                sql: "\"Kind\" IN ('ConfirmationEvidence', 'RecordedReceipt')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaycheckOccurrence_TimingOffset",
                table: "PaycheckOccurrences",
                sql: "\"Kind\" = 'RecordedReceipt' OR \"TimingOffsetDays\" BETWEEN -3 AND 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_PaycheckOccurrences_Profile_Slot",
                table: "PaycheckOccurrences");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PaycheckOccurrence_Kind",
                table: "PaycheckOccurrences");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PaycheckOccurrence_TimingOffset",
                table: "PaycheckOccurrences");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaycheckOccurrence_Kind",
                table: "PaycheckOccurrences",
                sql: "\"Kind\" = 'ConfirmationEvidence'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaycheckOccurrence_TimingOffset",
                table: "PaycheckOccurrences",
                sql: "\"TimingOffsetDays\" BETWEEN -3 AND 3");
        }
    }
}
