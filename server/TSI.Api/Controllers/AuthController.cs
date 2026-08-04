using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IConfiguration config, JwtService jwtService, ILogger<AuthController> logger) : ControllerBase
{
    // Credentials live in AspNetUsers, not tblUsers. The cloud-schema tblUsers has no
    // sUserName/sUserPassword columns at all — it is a profile table keyed by lUserKey,
    // and AspNetUsers.Id carries that same key. Passwords are ASP.NET Identity v3
    // hashes ("AQAAAA…") written by WinScope Cloud, which owns that store: this app only
    // ever verifies against them, and never rehashes or rewrites one.
    private static readonly PasswordHasher<object> PasswordHasher = new();

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Username and password required." });

        var connectionString = config.GetConnectionString("DefaultConnection")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // UserName and Email hold the same string for every current account, but accepting
        // either keeps login working if that ever diverges.
        //
        // Admin comes from two sources, and it needs both. Converted users have no
        // AspNetUserRoles rows at all — exactly one account in this database holds one —
        // so Identity roles alone would hand every real administrator a "User" token and
        // lock them out of every [Authorize(Roles="Admin")] controller. tblUsers.bSuperAdmin
        // is the operative admin flag for those users, and AspNetUsers.Id IS lUserKey, so
        // the profile row joins straight on. WinScope Cloud's own AuthController bridges
        // the same gap the same way (IsLegacySuperAdminAsync). The soft-delete filter
        // rides on the JOIN so a deleted profile row elevates nobody.
        const string sql = """
            SELECT u.Id, u.UserName, u.PasswordHash, u.MustResetPassword,
                   CAST(CASE WHEN EXISTS (
                       SELECT 1 FROM AspNetUserRoles ur
                       JOIN AspNetRoles r ON r.Id = ur.RoleId
                       WHERE ur.UserId = u.Id AND UPPER(r.Name) LIKE '%ADMIN%'
                   ) OR ISNULL(t.bSuperAdmin, 0) = 1 THEN 1 ELSE 0 END AS bit) AS bIsAdmin
            FROM AspNetUsers u
            LEFT JOIN tblUsers t ON t.lUserKey = u.Id AND t.Deleted_datetime IS NULL
            WHERE (LOWER(u.UserName) = LOWER(@username) OR LOWER(u.Email) = LOWER(@username))
              AND u.IsActive = 1
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@username", request.Username.Trim());

        int userKey;
        string userName;
        string storedHash;
        bool mustResetPassword;
        string role;

        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            // No row covers both "no such account" and "deactivated account". Neither is
            // distinguishable from the bad-password 401 below, so login never reveals
            // whether an account exists.
            if (!await reader.ReadAsync())
                return Unauthorized(new { message = "Invalid credentials." });

            userKey = Convert.ToInt32(reader["Id"]);
            userName = reader["UserName"]?.ToString() ?? request.Username;
            storedHash = reader["PasswordHash"]?.ToString() ?? "";
            mustResetPassword = reader["MustResetPassword"] != DBNull.Value
                             && Convert.ToBoolean(reader["MustResetPassword"]);
            role = reader["bIsAdmin"] != DBNull.Value && Convert.ToBoolean(reader["bIsAdmin"])
                ? "Admin" : "User";
        } // reader disposed here — connection is free for the UPDATE below

        if (string.IsNullOrEmpty(storedHash))
            return Unauthorized(new { message = "Invalid credentials." });

        // SuccessRehashNeeded means the password is correct but the hash uses an older
        // Identity format. That is still a successful verification; rewriting the stored
        // hash is WinScope Cloud's call, not ours.
        var verification = PasswordHasher.VerifyHashedPassword(new object(), storedHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid credentials." });

        // Lockout counters (AccessFailedCount / LockoutEnd) are deliberately not enforced
        // here: this app has no unlock or reset flow, so a lockout it applied would strand
        // the user until Cloud cleared it. Deferred, not overlooked.

        if (mustResetPassword)
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "This account must set a new password before signing in. Reset it from " +
                          "the WinScope Cloud login page, or contact an administrator."
            });

        // Best-effort: a failed stamp must NOT fail an otherwise-valid login, but it is
        // logged rather than silently swallowed.
        try
        {
            await using var updateCmd = new SqlCommand(
                "UPDATE AspNetUsers SET LastLoginDate = GETUTCDATE() WHERE Id = @id", conn);
            updateCmd.Parameters.AddWithValue("@id", userKey);
            updateCmd.CommandTimeout = 10;
            await updateCmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "LastLoginDate stamp failed for user {UserKey}", userKey);
        }

        var token = jwtService.GenerateToken(userName, role, userKey);
        var expiryHours = int.Parse(config["JWT:ExpiryHours"] ?? "8");

        return Ok(new LoginResponse(
            Token: token,
            Username: userName,
            Role: role,
            ExpiresAt: DateTime.UtcNow.AddHours(expiryHours)
        ));
    }
}
