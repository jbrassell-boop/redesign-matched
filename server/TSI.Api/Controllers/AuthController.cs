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
            SELECT sUserName, sPassword, sRole
            FROM tblUser
            WHERE sUserName = @username
              AND bActive = 1
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@username", request.Username);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Unauthorized(new { message = "Invalid credentials." });

        var storedPassword = reader["sPassword"]?.ToString() ?? "";
        var role = reader["sRole"]?.ToString() ?? "User";

        if (storedPassword != request.Password)
            return Unauthorized(new { message = "Invalid credentials." });

        var token = jwtService.GenerateToken(request.Username, role);
        var expiryHours = int.Parse(config["Jwt:ExpiryHours"] ?? "8");

        return Ok(new LoginResponse(
            Token: token,
            Username: request.Username,
            Role: role,
            ExpiresAt: DateTime.UtcNow.AddHours(expiryHours)
        ));
    }
}
