using System.Data;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Services;

public interface ILotNumberService
{
    /// <summary>
    /// Reserves and returns the next inventory lot number, reproducing the
    /// legacy <c>dbo.inventory_GetNextLotNumber</c> gap-fill. MUST run inside a
    /// transaction: a database-wide app-lock serializes concurrent allocations,
    /// and the reserved number is claimed in <c>tblLotNumberLock</c> so a second
    /// caller in the same window already sees it as used. The caller is expected
    /// to write the returned number onto a <c>tblInventoryTran</c> row in the
    /// same transaction (which then makes it permanently "used").
    /// </summary>
    Task<string> NextAsync(
        SqlConnection conn,
        SqlTransaction tx,
        int userKey = 0,
        int sessionId = 0,
        CancellationToken ct = default);
}

public class LotNumberService : ILotNumberService
{
    public async Task<string> NextAsync(
        SqlConnection conn,
        SqlTransaction tx,
        int userKey = 0,
        int sessionId = 0,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(tx);

        // Serialize all lot allocations so two concurrent receipts cannot read
        // the same used-set and hand out the same number. Released at tx end.
        await using (var lockCmd = new SqlCommand("sp_getapplock", conn, tx)
        {
            CommandType = CommandType.StoredProcedure,
        })
        {
            lockCmd.Parameters.AddWithValue("@Resource", "lot-number-allocation");
            lockCmd.Parameters.AddWithValue("@LockMode", "Exclusive");
            lockCmd.Parameters.AddWithValue("@LockOwner", "Transaction");
            lockCmd.Parameters.AddWithValue("@LockTimeout", 15000);
            var ret = new SqlParameter
            {
                ParameterName = "@ret",
                SqlDbType = SqlDbType.Int,
                Direction = ParameterDirection.ReturnValue,
            };
            lockCmd.Parameters.Add(ret);
            await lockCmd.ExecuteNonQueryAsync(ct);
            if (ret.Value is int rc && rc < 0)
                throw new InvalidOperationException(
                    $"Could not acquire the lot-number allocation lock (sp_getapplock returned {rc}).");
        }

        // "Used" = every lot number on a tran row (receipt OR consumption — once
        // a number has ever touched the ledger it is never re-issued), plus any
        // number currently reserved in the lock table. No Deleted_datetime filter
        // — matches the legacy union, which treats a number as spent forever.
        // int.TryParse is the strict numeric filter (skips any junk text).
        const string usedSql = """
            SELECT sLotNumber FROM dbo.tblInventoryTran WHERE sLotNumber IS NOT NULL
            UNION
            SELECT sLotNumber FROM dbo.tblLotNumberLock WHERE sLotNumber IS NOT NULL
            """;

        var used = new HashSet<int>();
        await using (var usedCmd = new SqlCommand(usedSql, conn, tx))
        {
            usedCmd.CommandTimeout = 30;
            await using var reader = await usedCmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                if (int.TryParse(reader["sLotNumber"]?.ToString(), out var n))
                    used.Add(n);
            }
        }

        var next = LotNumberAllocator.Next(used).ToString();

        // Claim it so a concurrent allocation (once we release the app-lock at
        // commit) and any read before the caller's tran row is committed both
        // see it as taken.
        const string claimSql = """
            INSERT INTO dbo.tblLotNumberLock (sLotNumber, lUserKey, lSessionID, Created_UserKey, Created_datetime)
            VALUES (@lot, @user, @session, @user, GETDATE())
            """;
        await using (var claimCmd = new SqlCommand(claimSql, conn, tx))
        {
            claimCmd.Parameters.AddWithValue("@lot", next);
            claimCmd.Parameters.AddWithValue("@user", userKey);
            claimCmd.Parameters.AddWithValue("@session", sessionId);
            await claimCmd.ExecuteNonQueryAsync(ct);
        }

        return next;
    }
}
