using Microsoft.Extensions.Options;
using MimeKit;

namespace BudgetPlanner.Configuration;

public sealed class EmailSettingsOptions
{
    public const string SectionName = "EmailSettings";

    public string FromName { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
    public string SmtpServer { get; init; } = string.Empty;
    public int SmtpPort { get; init; }
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

public sealed class EmailSettingsOptionsValidator : IValidateOptions<EmailSettingsOptions>
{
    public ValidateOptionsResult Validate(string? name, EmailSettingsOptions options)
    {
        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.FromName))
            failures.Add("EmailSettings:FromName is required.");
        if (string.IsNullOrWhiteSpace(options.FromEmail) ||
            !MailboxAddress.TryParse(options.FromEmail, out _))
            failures.Add("EmailSettings:FromEmail must be a valid email address.");
        if (string.IsNullOrWhiteSpace(options.SmtpServer))
            failures.Add("EmailSettings:SmtpServer is required.");
        if (options.SmtpPort is < 1 or > 65535)
            failures.Add("EmailSettings:SmtpPort must be between 1 and 65535.");
        if (string.IsNullOrWhiteSpace(options.Username))
            failures.Add("EmailSettings:Username is required.");
        if (string.IsNullOrWhiteSpace(options.Password))
            failures.Add("EmailSettings:Password is required.");

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
