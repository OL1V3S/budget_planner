using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddImportPreviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportPreviewBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<string>(type: "text", nullable: false),
                    SourceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ParserRuleVersion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DocumentDigest = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Lifecycle = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportPreviewBatches", x => x.Id);
                    table.CheckConstraint("CK_ImportPreviewBatch_DigestLength", "octet_length(\"DocumentDigest\") = 32");
                    table.CheckConstraint("CK_ImportPreviewBatch_Expiry", "\"ExpiresAt\" > \"CreatedAt\"");
                    table.CheckConstraint("CK_ImportPreviewBatch_SourceType", "\"SourceType\" = 'sunflower_pdf'");
                    table.ForeignKey(
                        name: "FK_ImportPreviewBatches_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportPreviewRows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceRowOrdinal = table.Column<int>(type: "integer", nullable: false),
                    PostedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Direction = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SourceSection = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SourcePageNumber = table.Column<int>(type: "integer", nullable: false),
                    Classification = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsEligible = table.Column<bool>(type: "boolean", nullable: false),
                    ValidationErrorCodes = table.Column<string>(type: "jsonb", nullable: false),
                    WarningCodes = table.Column<string>(type: "jsonb", nullable: false),
                    IsPossibleDuplicate = table.Column<bool>(type: "boolean", nullable: false),
                    DuplicateExpenseIds = table.Column<string>(type: "jsonb", nullable: false),
                    EditableExpenseDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SelectedForImport = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportPreviewRows", x => x.Id);
                    table.CheckConstraint("CK_ImportPreviewRow_PositiveAmount", "\"Amount\" IS NULL OR \"Amount\" > 0");
                    table.ForeignKey(
                        name: "FK_ImportPreviewRows_ImportPreviewBatches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "ImportPreviewBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImportPreviewBatches_ExpiresAt",
                table: "ImportPreviewBatches",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_ImportPreviewBatches_OwnerId_SourceType_DocumentDigest",
                table: "ImportPreviewBatches",
                columns: new[] { "OwnerId", "SourceType", "DocumentDigest" },
                unique: true,
                filter: "\"Lifecycle\" = 'Open'");

            migrationBuilder.CreateIndex(
                name: "IX_ImportPreviewRows_BatchId_SourceRowOrdinal",
                table: "ImportPreviewRows",
                columns: new[] { "BatchId", "SourceRowOrdinal" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportPreviewRows");

            migrationBuilder.DropTable(
                name: "ImportPreviewBatches");
        }
    }
}
