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

    // Verifying a password costs thousands of PBKDF2 iterations; returning 401 without
    // doing it is measurably faster. That difference is enough to probe which usernames
    // exist, which would undo the deliberately identical 401 messages below. The
    // account-missing and no-hash paths verify against this throwaway hash first and
    // discard the answer, so every rejection costs about the same. Computed once.
    private static readonly string DummyPasswordHash =
        PasswordHasher.HashPassword(new object(), "timing-equalization-only-never-a-credential");

    // UserName and Email hold the same string for every current account, but accepting
    // either keeps login working if that ever diverges.
    //
    // Admin comes from Identity roles ONLY: an AspNetUserRoles row joining to the
    // AspNetRoles row whose NormalizedName is exactly 'ADMIN'. Those rows are seeded
    // deliberately on live (decided 2026-08-04) — administrators are granted, never
    // inferred.
    //
    // This query deliberately reads a narrower set of columns than the local practice
    // database offers, because the two schemas have drifted. Neither
    // AspNetUsers.MustResetPassword nor tblUsers.bSuperAdmin exists on live Azure,
    // though both exist on localhost. An earlier revision of this fix read both, and
    // would have thrown "Invalid column name" on live — the same 500 for every user
    // that this controller was rewritten to fix, reintroduced by trusting a practice
    // schema. There is no super-admin concept live and no password-reset flow in this
    // app, so both were removed outright rather than guarded. Login may reference only
    // AspNetUsers(Id, UserName, Email, PasswordHash, IsActive, LastLoginDate),
    // AspNetUserRoles(UserId, RoleId) and AspNetRoles(Id, NormalizedName);
    // AuthControllerLoginTests pins that.
    //
    // The role name is matched EXACTLY, against NormalizedName. This is an auth gate,
    // so a substring test is too loose: any future role merely containing "admin" —
    // "NonAdmin", "BillingAdminAssistant" — would silently grant full access. Live
    // AspNetRoles is EMPTY until the 2026-08-04 seed creates exactly Name 'Admin' /
    // NormalizedName 'ADMIN' (localhost already has that row); Cloud assigns from a
    // fixed set ("Admin", "Internal", "Portal"), so an exact match loses nothing —
    // but if the seed ever lands a differently-normalized name, every admin silently
    // degrades to "User". Verify the seeded row with one SELECT before shipping.
    internal static readonly string LoginSql = """
        SELECT u.Id, u.UserName, u.PasswordHash,
               CAST(CASE WHEN EXISTS (
                   SELECT 1 FROM AspNetUserRoles ur
                   JOIN AspNetRoles r ON r.Id = ur.RoleId
                   WHERE ur.UserId = u.Id AND r.NormalizedName = N'ADMIN'
               ) THEN 1 ELSE 0 END AS bit) AS bIsAdmin
        FROM AspNetUsers u
        WHERE (LOWER(u.UserName) = LOWER(@username) OR LOWER(u.Email) = LOWER(@username))
          AND u.IsActive = 1
        """;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Username and password required." });

        var connectionString = config.GetConnectionString("DefaultConnection")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(LoginSql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@username", request.Username.Trim());

        int userKey;
        string userName;
        string storedHash;
        string role;

        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            // No row covers both "no such account" and "deactivated account". Neither is
            // distinguishable from the bad-password 401 below, so login never reveals
            // whether an account exists — in the response or in how long it took.
            if (!await reader.ReadAsync())
            {
                _ = PasswordHasher.VerifyHashedPassword(new object(), DummyPasswordHash, request.Password);
                return Unauthorized(new { message = "Invalid credentials." });
            }

            userKey = Convert.ToInt32(reader["Id"]);
            userName = reader["UserName"]?.ToString() ?? request.Username;
            storedHash = reader["PasswordHash"]?.ToString() ?? "";
            role = reader["bIsAdmin"] != DBNull.Value && Convert.ToBoolean(reader["bIsAdmin"])
                ? "Admin" : "User";

            // Fail closed on ambiguity. LoginSql matches UserName OR Email, and scrubbed
            // data can break Email uniqueness so that one active account matches by
            // UserName while a DIFFERENT active account matches by Email. SQL Server may
            // return either row first, so trusting this single row could reject a valid
            // user or, worse, mint a token for the unintended identity. A second matching
            // row means we authenticate no one — same 401, and the same timing
            // equalization as the no-account path above.
            if (await reader.ReadAsync())
            {
                _ = PasswordHasher.VerifyHashedPassword(new object(), DummyPasswordHash, request.Password);
                logger.LogWarning(
                    "Ambiguous login identifier {Identifier} matched multiple active accounts; failing closed",
                    request.Username);
                return Unauthorized(new { message = "Invalid credentials." });
            }
        } // reader disposed here — connection is free for the UPDATE below

        // An account with no stored hash cannot authenticate. Same equalization as above:
        // skipping the work here would make hash-less accounts identifiable by response time.
        if (string.IsNullOrEmpty(storedHash))
        {
            _ = PasswordHasher.VerifyHashedPassword(new object(), DummyPasswordHash, request.Password);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        // SuccessRehashNeeded means the password is correct but the hash uses an older
        // Identity format. That is still a successful verification; rewriting the stored
        // hash is WinScope Cloud's call, not ours.
        //
        // A non-empty hash that is not a valid Identity hash makes VerifyHashedPassword
        // THROW (base64-decoding the stored hash is its first step) rather than return
        // Failed. Live has scrubbed accounts holding garbage in PasswordHash, so an
        // unguarded verify 500s exactly those logins — the failure this branch exists to
        // remove; the empty-hash case is guarded above, the malformed non-empty one was
        // not. A malformed hash can never authenticate: treat the throw as a failed
        // verification and return the same 401 as a bad password, logging the userKey
        // best-effort (like the LastLoginDate stamp) so ops can find the bad row.
        PasswordVerificationResult verification;
        try
        {
            verification = PasswordHasher.VerifyHashedPassword(new object(), storedHash, request.Password);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Malformed stored password hash for user {UserKey}; treating as failed verification", userKey);
            // The throw lands before any KDF runs, so without this the malformed path would
            // return measurably faster than a real wrong password and mark scrubbed accounts
            // by timing. Same equalization as the no-account and no-hash paths.
            _ = PasswordHasher.VerifyHashedPassword(new object(), DummyPasswordHash, request.Password);
            return Unauthorized(new { message = "Invalid credentials." });
        }
        if (verification == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid credentials." });

        // Lockout counters (AccessFailedCount / LockoutEnd) are deliberately not enforced
        // here: this app has no unlock or reset flow, so a lockout it applied would strand
        // the user until Cloud cleared it. Deferred, not overlooked.

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
