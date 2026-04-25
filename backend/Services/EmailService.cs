using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace BudgetPlanner.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var emailSettings = _configuration.GetSection("EmailSettings");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(
            emailSettings["FromName"],
            emailSettings["FromEmail"]
        ));

        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody
        }.ToMessageBody();

        using var client = new SmtpClient();

        await client.ConnectAsync(
            emailSettings["SmtpServer"],
            int.Parse(emailSettings["SmtpPort"]!),
            SecureSocketOptions.StartTls
        );

        await client.AuthenticateAsync(
            emailSettings["Username"],
            emailSettings["Password"]
        );

        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}