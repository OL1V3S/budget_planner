using MimeKit;
using BudgetPlanner.Configuration;
using Google;
using Google.Apis.Auth.OAuth2.Responses;
using Microsoft.Extensions.Options;

namespace BudgetPlanner.Services;

public class EmailService(
    IOptions<EmailSettingsOptions> emailSettings,
    IGmailApiClient gmailApiClient) : IEmailService
{
    public async Task SendEmailAsync(
        string toEmail,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
    {
        var settings = emailSettings.Value;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(
            settings.FromName,
            settings.FromEmail
        ));

        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody
        }.ToMessageBody();

        using var stream = new MemoryStream();
        await message.WriteToAsync(stream, cancellationToken);
        var rawMessage = Convert.ToBase64String(stream.ToArray())
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

        try
        {
            await gmailApiClient.SendRawMessageAsync(
                "me",
                rawMessage,
                cancellationToken);
        }
        catch (Exception exception) when (
            IsExpectedDeliveryFailure(exception) &&
            !(exception is OperationCanceledException && cancellationToken.IsCancellationRequested))
        {
            throw new EmailDeliveryException(
                "The email provider did not accept the message.",
                exception);
        }
    }

    private static bool IsExpectedDeliveryFailure(Exception exception) =>
        exception is GoogleApiException
            or TokenResponseException
            or HttpRequestException
            or IOException
            or TimeoutException
            or OperationCanceledException;
}
