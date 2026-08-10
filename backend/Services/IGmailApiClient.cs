namespace BudgetPlanner.Services;

public interface IGmailApiClient
{
    Task SendRawMessageAsync(
        string userId,
        string rawMessage,
        CancellationToken cancellationToken = default);
}
