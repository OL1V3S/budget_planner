using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace BudgetPlanner.Authentication;

public interface IForgotPasswordLimiter
{
    bool TryAcquireGlobal();
    bool TryAcquireRecipient(string requestedEmail);
}

public sealed class ForgotPasswordLimiterOptions
{
    public const int DefaultGlobalPermitLimit = 60;
    public const int DefaultRecipientPermitLimit = 3;

    public int GlobalPermitLimit { get; set; } = DefaultGlobalPermitLimit;
    public int RecipientPermitLimit { get; set; } = DefaultRecipientPermitLimit;
    public TimeSpan Window { get; set; } = TimeSpan.FromMinutes(1);
}

public sealed class ForgotPasswordLimiter : IForgotPasswordLimiter, IDisposable
{
    private static readonly ILookupNormalizer EmailNormalizer = new UpperInvariantLookupNormalizer();

    private readonly FixedWindowRateLimiter _globalLimiter;
    private readonly PartitionedRateLimiter<string> _recipientLimiter;

    public ForgotPasswordLimiter(IOptions<ForgotPasswordLimiterOptions> options)
    {
        var settings = options.Value;
        _globalLimiter = new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
        {
            PermitLimit = settings.GlobalPermitLimit,
            Window = settings.Window,
            QueueLimit = 0,
            AutoReplenishment = true
        });
        _recipientLimiter = PartitionedRateLimiter.Create<string, string>(normalizedEmail =>
            RateLimitPartition.GetFixedWindowLimiter(
                normalizedEmail,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = settings.RecipientPermitLimit,
                    Window = settings.Window,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
    }

    public bool TryAcquireGlobal()
    {
        using var lease = _globalLimiter.AttemptAcquire();
        return lease.IsAcquired;
    }

    public bool TryAcquireRecipient(string requestedEmail)
    {
        var normalizedEmail = EmailNormalizer.NormalizeEmail(
            requestedEmail.Trim()) ?? string.Empty;
        using var lease = _recipientLimiter.AttemptAcquire(normalizedEmail);
        return lease.IsAcquired;
    }

    public void Dispose()
    {
        _globalLimiter.Dispose();
        _recipientLimiter.Dispose();
    }
}
