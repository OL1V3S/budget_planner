using Microsoft.Extensions.Options;
using MimeKit;

namespace BudgetPlanner.Configuration;

public sealed class EmailSettingsOptions
{
    public const string SectionName = "EmailSettings";

    public string FromName { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
}

public sealed class EmailSettingsOptionsValidator : IValidateOptions<EmailSettingsOptions>
{
    public ValidateOptionsResult Validate(string? name, EmailSettingsOptions options)
    {
        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.FromName))
            failures.Add("EmailSettings:FromName is required.");
        if (string.IsNullOrWhiteSpace(options.FromEmail) ||
            !MailboxAddress.TryParse(options.FromEmail, out var mailbox) ||
            !mailbox.Address.Contains('@', StringComparison.Ordinal) ||
            mailbox.Address.StartsWith('@') ||
            mailbox.Address.EndsWith('@'))
            failures.Add("EmailSettings:FromEmail must be a valid email address.");
        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
