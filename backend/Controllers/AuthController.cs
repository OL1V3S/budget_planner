using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BudgetPlanner.Models;
using BudgetPlanner.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Tokens;

namespace BudgetPlanner.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        IEmailService emailService)
    {
        _userManager = userManager;
        _configuration = configuration;
        _emailService = emailService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"];

        var confirmationLink =
            $"{frontendBaseUrl}/confirm-email?userId={user.Id}&token={encodedToken}";

        await _emailService.SendEmailAsync(
            request.Email,
            "Confirm your Budget Planner account",
            $"""
            <div style="background:#0f172a; padding:40px 20px; font-family:Arial, sans-serif;">
              <div style="max-width:500px; margin:auto; background:#020617; border-radius:14px; padding:24px; border:1px solid #1f2933;">

                <h2 style="color:#e5e7eb; margin:0 0 10px;">Budget Planner</h2>

                <p style="color:rgba(255,255,255,0.7); margin:0 0 20px;">
                  Confirm your email to finish creating your account.
                </p>

                <a href="{confirmationLink}"
                   style="display:inline-block; padding:12px 20px; background:#2e6dd3; color:white; text-decoration:none; border-radius:12px; font-weight:600;">
                  Confirm Email
                </a>

                <p style="color:rgba(255,255,255,0.5); margin-top:25px; font-size:13px;">
                  If you didn’t create this account, you can safely ignore this email.
                </p>
              </div>
            </div>
            """
        );

        return Ok(new
        {
            message = "User registered successfully. Please check your email to confirm your account."
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user == null)
            return Unauthorized("Invalid email or password");

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);

        if (!passwordValid)
            return Unauthorized("Invalid email or password");

        if (!await _userManager.IsEmailConfirmedAsync(user))
            return Unauthorized("Please confirm your email before logging in.");

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            token,
            email = user.Email
        });
    }

    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);

        if (user == null)
            return BadRequest("Invalid user");

        var tokenBytes = WebEncoders.Base64UrlDecode(request.Token);
        var decodedToken = Encoding.UTF8.GetString(tokenBytes);

        var result = await _userManager.ConfirmEmailAsync(user, decodedToken);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(new { message = "Email confirmed successfully" });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user == null)
        {
            return Ok(new
            {
                message = "If the email exists, a reset link was sent."
            });
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"];

        var resetLink =
            $"{frontendBaseUrl}/reset-password?email={Uri.EscapeDataString(request.Email)}&token={encodedToken}";

        await _emailService.SendEmailAsync(
            request.Email,
            "Reset your Budget Planner password",
            $"""
            <div style="background:#0f172a; padding:40px 20px; font-family:Arial, sans-serif;">
              <div style="max-width:500px; margin:auto; background:#020617; border-radius:14px; padding:24px; border:1px solid #1f2933;">

                <h2 style="color:#e5e7eb; margin:0 0 10px;">Budget Planner</h2>

                <p style="color:rgba(255,255,255,0.7); margin:0 0 20px;">
                  Reset your password using the button below.
                </p>

                <a href="{resetLink}"
                   style="display:inline-block; padding:12px 20px; background:#ef4444; color:white; text-decoration:none; border-radius:12px; font-weight:600;">
                  Reset Password
                </a>

                <p style="color:rgba(255,255,255,0.5); margin-top:25px; font-size:13px;">
                  If you didn’t request this, you can ignore this email.
                </p>
              </div>
            </div>
            """
        );

        return Ok(new
        {
            message = "If the email exists, a reset link was sent."
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user == null)
            return BadRequest("Invalid request");

        var tokenBytes = WebEncoders.Base64UrlDecode(request.Token);
        var decodedToken = Encoding.UTF8.GetString(tokenBytes);

        var result = await _userManager.ResetPasswordAsync(
            user,
            decodedToken,
            request.NewPassword
        );

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(new { message = "Password reset successfully" });
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT key is missing");

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim(ClaimTypes.Name, user.UserName ?? "")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record ConfirmEmailRequest(string UserId, string Token);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);