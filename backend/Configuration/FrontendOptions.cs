using Microsoft.Extensions.Options;

namespace BudgetPlanner.Configuration;

public sealed class FrontendOptions
{
    public const string SectionName = "Frontend";

    public string BaseUrl { get; init; } = string.Empty;
}

public sealed class FrontendOptionsValidator(IHostEnvironment environment)
    : IValidateOptions<FrontendOptions>
{
    public ValidateOptionsResult Validate(string? name, FrontendOptions options)
    {
        if (!Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) ||
            !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment))
        {
            return ValidateOptionsResult.Fail(
                "Frontend:BaseUrl must be an absolute HTTP or HTTPS URL without a query or fragment.");
        }

        if (environment.IsProduction() && uri.Scheme != Uri.UriSchemeHttps)
        {
            return ValidateOptionsResult.Fail(
                "Frontend:BaseUrl must use HTTPS in production.");
        }

        return ValidateOptionsResult.Success;
    }
}
