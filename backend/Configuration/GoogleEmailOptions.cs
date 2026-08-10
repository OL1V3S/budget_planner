using Microsoft.Extensions.Options;

namespace BudgetPlanner.Configuration;

public sealed class GoogleEmailOptions
{
    public const string SectionName = "GoogleEmail";

    public string ClientId { get; init; } = string.Empty;
    public string ClientSecret { get; init; } = string.Empty;
    public string RefreshToken { get; init; } = string.Empty;
}

public sealed class GoogleEmailOptionsValidator : IValidateOptions<GoogleEmailOptions>
{
    public ValidateOptionsResult Validate(string? name, GoogleEmailOptions options)
    {
        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.ClientId))
            failures.Add("GoogleEmail:ClientId is required.");
        if (string.IsNullOrWhiteSpace(options.ClientSecret))
            failures.Add("GoogleEmail:ClientSecret is required.");
        if (string.IsNullOrWhiteSpace(options.RefreshToken))
            failures.Add("GoogleEmail:RefreshToken is required.");

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
