using System.Data;
using System.Globalization;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Services;

/// <summary>
/// The kind of purchase order being numbered. Drives the type character in the
/// seed: Inventory='I', Acquisition='A', Cart='C'.
/// </summary>
public enum POType
{
    Inventory,
    Acquisition,
    Cart,
}

/// <summary>
/// Supplier-PO number generator. Ported from the cloud-stack
/// <c>WinscopeNet.Infrastructure</c> equivalent so happy-plant and the cloud
/// deploy produce identical PO numbers. Two-step:
///   1. Read <c>sTransNumberPrefix</c> (N/S/F) from <c>tblServiceLocations</c>.
///   2. Build the 7-char seed <c>{prefix}P{typeChar}{yyMM}</c> and call
///      <c>dbo.poNumberDailyGet</c>, which atomically increments the per-seed
///      counter in <c>dbo.tblPONumbersUsed</c> and returns the next sequence.
/// Result is the seed + the zero-padded 3-digit sequence, e.g. <c>NPI2606001</c>
/// (North parts Inventory, June 2026, #1) — byte-compatible with the legacy
/// WinScope desktop format.
/// </summary>
public interface IPONumberService
{
    /// <param name="conn">An open connection; the caller owns its lifecycle.</param>
    /// <param name="tx">Optional transaction to enroll the counter increment in,
    /// so a rollback of the caller's PO INSERT also rolls back the number.</param>
    Task<string> NextAsync(
        POType type,
        int serviceLocationKey,
        SqlConnection conn,
        SqlTransaction? tx = null,
        CancellationToken ct = default);
}

public class PONumberService : IPONumberService
{
    public async Task<string> NextAsync(
        POType type,
        int serviceLocationKey,
        SqlConnection conn,
        SqlTransaction? tx = null,
        CancellationToken ct = default)
    {
        const string prefixSql = """
            SELECT sTransNumberPrefix
            FROM dbo.tblServiceLocations
            WHERE lServiceLocationKey = @loc
            """;
        await using var prefixCmd = new SqlCommand(prefixSql, conn, tx);
        prefixCmd.Parameters.AddWithValue("@loc", serviceLocationKey);
        var rawPrefix = await prefixCmd.ExecuteScalarAsync(ct);

        if (rawPrefix is null || rawPrefix == DBNull.Value)
        {
            throw new InvalidOperationException(
                $"No tblServiceLocations row for lServiceLocationKey = {serviceLocationKey}, "
                + "or its sTransNumberPrefix is NULL. Cannot generate a PO number.");
        }
        var prefix = ((string)rawPrefix).Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(prefix) || prefix.Length != 1)
        {
            throw new InvalidOperationException(
                $"tblServiceLocations.sTransNumberPrefix for location {serviceLocationKey} "
                + $"is '{prefix}' — expected exactly one character (N/S/F).");
        }

        var typeChar = TypeToChar(type);
        var yyMM = DateTime.Today.ToString("yyMM", CultureInfo.InvariantCulture);
        var seed = $"{prefix}P{typeChar}{yyMM}";

        await using var procCmd = new SqlCommand("dbo.poNumberDailyGet", conn, tx)
        {
            CommandType = CommandType.StoredProcedure,
        };
        procCmd.Parameters.AddWithValue("@psSeed", seed);

        var result = await procCmd.ExecuteScalarAsync(ct);
        if (result is null || result == DBNull.Value)
        {
            throw new InvalidOperationException(
                $"poNumberDailyGet returned null for seed '{seed}'.");
        }

        var sequence = Convert.ToInt32(result, CultureInfo.InvariantCulture);
        return seed + sequence.ToString("000", CultureInfo.InvariantCulture);
    }

    private static char TypeToChar(POType t) => t switch
    {
        POType.Inventory => 'I',
        POType.Acquisition => 'A',
        POType.Cart => 'C',
        _ => throw new ArgumentOutOfRangeException(nameof(t), t,
            "Unknown POType — extend TypeToChar() if you've added a new value."),
    };
}
