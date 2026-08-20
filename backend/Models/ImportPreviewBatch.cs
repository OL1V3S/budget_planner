namespace BudgetPlanner.Models;

public enum ImportPreviewLifecycle
{
    Open,
    Expired
}

public class ImportPreviewBatch
{
    public Guid Id { get; set; }
    public string OwnerId { get; set; } = "";
    public ApplicationUser? Owner { get; set; }
    public string SourceType { get; set; } = "";
    public string ParserRuleVersion { get; set; } = "";
    public byte[] DocumentDigest { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public ImportPreviewLifecycle Lifecycle { get; set; }
    public List<ImportPreviewRow> Rows { get; set; } = [];
}
