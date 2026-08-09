using System.Net.Sockets;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using BudgetPlanner.Configuration;
using Microsoft.Extensions.Options;

namespace BudgetPlanner.Services;

public class EmailService(IOptions<EmailSettingsOptions> emailSettings) : IEmailService
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

        using var client = new SmtpClient();

        try
        {
            await client.ConnectAsync(
                settings.SmtpServer,
                settings.SmtpPort,
                SecureSocketOptions.StartTls,
                cancellationToken
            );

            await client.AuthenticateAsync(
                settings.Username,
                settings.Password,
                cancellationToken
            );

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception exception) when (IsExpectedDeliveryFailure(exception))
        {
            throw new EmailDeliveryException(
                "The email provider did not accept the message.",
                exception);
        }
    }

    private static bool IsExpectedDeliveryFailure(Exception exception) =>
        exception is SmtpCommandException
            or SmtpProtocolException
            or ServiceNotConnectedException
            or ServiceNotAuthenticatedException
            or SocketException
            or IOException
            or System.Security.Authentication.AuthenticationException
            or MailKit.Security.AuthenticationException
            or TimeoutException
            or SslHandshakeException;
}
