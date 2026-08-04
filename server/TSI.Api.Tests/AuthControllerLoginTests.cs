using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TSI.Api.Controllers;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Tests;

/// <summary>
/// Controller-level integration tests for POST /api/auth/login against localhost\WinscopeWeb.
///
/// These have to be integration tests: the defect they pin down is that the login query
/// named columns (sUserName / sUserPassword) that do not exist anywhere in the cloud-schema
/// tblUsers, so every live login returned 500. Only a real connection sees that — the code
/// reads perfectly well in isolation.
///
/// SHARED DATABASE. Every fixture inserts its own AspNetUsers row with a zzt-tagged
/// UserName/Email, captures the identity value, and deletes by that exact Id in a finally.
/// No real account is read, written, or counted — Joe's row (Id 84) in particular is never
/// touched. AspNetUsers has no inbound foreign keys (verified via sys.foreign_keys), so the
/// bare delete is sufficient.
/// </summary>
public sealed class AuthControllerLoginTests
{
    private const string ConnectionString =
        "Server=localhost;Database=WinscopeWeb;Trusted_Connection=True;TrustServerCertificate=True;";

    private readonly IConfiguration _config;

    public AuthControllerLoginTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                // HmacSha256 needs a key of at least 256 bits or SigningCredentials throws.
                ["Jwt:Secret"] = "tsi-api-test-signing-key-not-a-real-secret-0123456789",
                ["Jwt:Issuer"] = "tsi-api",
                ["Jwt:Audience"] = "tsi-client",
                ["Jwt:ExpiryHours"] = "8",
            })
            .Build();
    }

    // ─── Test A — the red one ────────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_ReturnsTokenCarryingTheAspNetUsersId()
    {
        var user = await CreateUserFixtureAsync();
        try
        {
            var before = DateTime.UtcNow.AddSeconds(-5);
            var result = await CreateController().Login(new LoginRequest(user.Email, user.Password));

            var ok = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<LoginResponse>(ok.Value);

            Assert.False(string.IsNullOrWhiteSpace(body.Token),
                "A successful login must return a signed JWT.");
            Assert.Equal(user.UserName, body.Username);
            Assert.False(string.IsNullOrWhiteSpace(body.Role));
            Assert.True(body.ExpiresAt > DateTime.UtcNow);

            // user_key is what GetCurrentUserKey() reads for the audit columns, so a
            // token that carries the wrong integer would mis-attribute every later write.
            var token = new JwtSecurityTokenHandler().ReadJwtToken(body.Token);
            var userKeyClaim = token.Claims.Single(c => c.Type == "user_key").Value;
            Assert.Equal(user.Id.ToString(CultureInfo.InvariantCulture), userKeyClaim);

            var lastLogin = await ReadLastLoginDateAsync(user.Id);
            Assert.True(lastLogin.HasValue && lastLogin.Value >= before,
                $"LastLoginDate should have been stamped on a successful login; read back {lastLogin?.ToString("O") ?? "NULL"}.");
        }
        finally
        {
            await DeleteUserAsync(user.Id);
        }
    }

    // ─── Test B — wrong password ─────────────────────────────────────────────

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var user = await CreateUserFixtureAsync();
        try
        {
            var result = await CreateController().Login(new LoginRequest(user.Email, user.Password + "-wrong"));
            Assert.IsType<UnauthorizedObjectResult>(result);
        }
        finally
        {
            await DeleteUserAsync(user.Id);
        }
    }

    // ─── Test C — deactivated account ────────────────────────────────────────

    [Fact]
    public async Task Login_InactiveUserWithCorrectPassword_Returns401()
    {
        var user = await CreateUserFixtureAsync(isActive: false);
        try
        {
            var result = await CreateController().Login(new LoginRequest(user.Email, user.Password));

            // Same 401 as a bad password — an inactive account must not be distinguishable
            // from a non-existent one on the unauthenticated channel.
            Assert.IsType<UnauthorizedObjectResult>(result);
        }
        finally
        {
            await DeleteUserAsync(user.Id);
        }
    }

    // ─── Test D — forced password reset ──────────────────────────────────────

    [Fact]
    public async Task Login_MustResetPasswordUser_Returns403AndNoToken()
    {
        var user = await CreateUserFixtureAsync(mustResetPassword: true);
        try
        {
            var result = await CreateController().Login(new LoginRequest(user.Email, user.Password));

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);
            Assert.IsNotType<LoginResponse>(objectResult.Value);
        }
        finally
        {
            await DeleteUserAsync(user.Id);
        }
    }

    // ─── Test E — username and email are both accepted ───────────────────────

    [Fact]
    public async Task Login_ByUserNameAndByEmail_BothSucceedForTheSameAccount()
    {
        // The fixture deliberately gives UserName and Email different values. In the
        // production data they happen to be identical strings, which would let a
        // single-column lookup pass this test by accident.
        var user = await CreateUserFixtureAsync();
        try
        {
            Assert.NotEqual(user.UserName, user.Email);

            var byUserName = await CreateController().Login(new LoginRequest(user.UserName, user.Password));
            var byEmail = await CreateController().Login(new LoginRequest(user.Email, user.Password));

            var okByUserName = Assert.IsType<OkObjectResult>(byUserName);
            var okByEmail = Assert.IsType<OkObjectResult>(byEmail);

            Assert.Equal(user.UserName, Assert.IsType<LoginResponse>(okByUserName.Value).Username);
            Assert.Equal(user.UserName, Assert.IsType<LoginResponse>(okByEmail.Value).Username);
        }
        finally
        {
            await DeleteUserAsync(user.Id);
        }
    }

    // ─── Fixtures ────────────────────────────────────────────────────────────

    private sealed record UserFixture(int Id, string UserName, string Email, string Password);

    /// <summary>
    /// Inserts one scoped AspNetUsers row whose PasswordHash is produced by the same
    /// ASP.NET Identity hasher the controller verifies with, so the test proves the
    /// real format (AQAAAA…) round-trips rather than asserting on a hand-rolled scheme.
    /// Every non-nullable column not listed here carries a database default.
    /// </summary>
    private static async Task<UserFixture> CreateUserFixtureAsync(
        bool isActive = true, bool mustResetPassword = false)
    {
        var tag = "zzt-" + Guid.NewGuid().ToString("N")[..8];
        var userName = tag + "-user";
        var email = tag + "@test.local";
        var password = "Zzt!Fixture#" + Guid.NewGuid().ToString("N")[..8];
        var hash = new PasswordHasher<object>().HashPassword(new object(), password);

        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            INSERT INTO dbo.AspNetUsers (UserName, NormalizedUserName, Email, NormalizedEmail,
                EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp,
                FirstName, LastName, IsActive, IsPortalUser, CreatedDate, MustResetPassword)
            OUTPUT INSERTED.Id
            VALUES (@userName, UPPER(@userName), @email, UPPER(@email),
                1, @hash, @stamp, @stamp,
                'Fixture', 'User', @isActive, 0, GETUTCDATE(), @mustReset);
            """, conn);
        cmd.Parameters.AddWithValue("@userName", userName);
        cmd.Parameters.AddWithValue("@email", email);
        cmd.Parameters.AddWithValue("@hash", hash);
        cmd.Parameters.AddWithValue("@stamp", Guid.NewGuid().ToString("N"));
        cmd.Parameters.AddWithValue("@isActive", isActive);
        cmd.Parameters.AddWithValue("@mustReset", mustResetPassword);

        var raw = await cmd.ExecuteScalarAsync();
        if (raw is null || raw == DBNull.Value)
            throw new InvalidOperationException("Test setup: could not insert an AspNetUsers fixture row.");

        return new UserFixture(Convert.ToInt32(raw, CultureInfo.InvariantCulture), userName, email, password);
    }

    /// <summary>Deletes exactly the fixture row, by its captured identity value.</summary>
    private static async Task DeleteUserAsync(int id)
    {
        if (id <= 0) return;

        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("DELETE FROM dbo.AspNetUsers WHERE Id = @id", conn);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<DateTime?> ReadLastLoginDateAsync(int id)
    {
        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("SELECT LastLoginDate FROM dbo.AspNetUsers WHERE Id = @id", conn);
        cmd.Parameters.AddWithValue("@id", id);
        var raw = await cmd.ExecuteScalarAsync();
        return raw is null || raw == DBNull.Value
            ? null
            : Convert.ToDateTime(raw, CultureInfo.InvariantCulture);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private AuthController CreateController() =>
        new(_config, new JwtService(_config), NullLogger<AuthController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
}
