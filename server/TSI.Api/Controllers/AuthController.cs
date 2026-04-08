using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IConfiguration config, JwtService jwtService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Username and password required." });

        var connectionString = config.GetConnectionString("DefaultConnection")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        const string sql = """
            SELECT sUserName, sUserPassword, sUserFullName, sEmailAddress,
                   sSupervisor, sISOManager, sISOQAReviewer, lUserKey
            FROM tblUsers
            WHERE LOWER(sUserName) = LOWER(@username)
              AND bActive = 1
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@username", request.Username);

        string storedPassword;
        string role;

        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            if (!await reader.ReadAsync())
                return Unauthorized(new { message = "Invalid credentials." });

            storedPassword = reader["sUserPassword"]?.ToString() ?? "";
            role = (reader["sSupervisor"]?.ToString() == "1") ? "Admin" : "User";
        } // reader disposed here — connection is free for the UPDATE below

        bool valid;
        if (storedPassword.StartsWith("$2"))
        {
            // Already a BCrypt hash — verify normally
            valid = BCrypt.Net.BCrypt.Verify(request.Password, storedPassword);
        }
        else
        {
            // Plaintext legacy password — fall back to direct comparison
            valid = storedPassword == request.Password;
            if (valid)
            {
                // Auto-upgrade: store a hash so next login uses BCrypt
                var hash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                await using var updateCmd = new SqlCommand(
                    "UPDATE tblUsers SET sUserPassword = @hash WHERE LOWER(sUserName) = LOWER(@user)",
                    conn);
                updateCmd.Parameters.AddWithValue("@hash", hash);
                updateCmd.Parameters.AddWithValue("@user", request.Username);
                updateCmd.CommandTimeout = 10;
                await updateCmd.ExecuteNonQueryAsync();
            }
        }

        if (!valid)
            return Unauthorized(new { message = "Invalid credentials." });

        var token = jwtService.GenerateToken(request.Username, role);
        var expiryHours = int.Parse(config["JWT:ExpiryHours"] ?? "8");

        return Ok(new LoginResponse(
            Token: token,
            Username: request.Username,
            Role: role,
            ExpiresAt: DateTime.UtcNow.AddHours(expiryHours)
        ));
    }
}
