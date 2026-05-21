using System.Data;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Services;

/// <summary>
/// Single source of truth for work-order / invoice number generation. Wraps
/// the canonical <c>dbo.invoiceNumberDailyGet</c> stored proc (added by
/// migration 015 — atomic MERGE-with-HOLDLOCK).
///
/// Produces 10-char numbers in the shape <c>&lt;prefix&gt;&lt;type&gt;&lt;yyDDD&gt;&lt;seq3&gt;</c>:
///   NR26140001  North repair, day 140 of 2026, #1
///   SI26140042  South product-sale Invoice, day 140 of 2026, #42
///   FV26140007  Florida onsite (van), day 140 of 2026, #7
///   NK26140003  North cart, day 140 of 2026, #3
///
/// Mirrors the cloud-stack equivalent in <c>WinscopeNet.Infrastructure</c>
/// so happy-plant and the cloud deploy produce matching WO formats.
/// </summary>
public interface IInvoiceNumberService
{
    /// <param name="invoiceType">
    /// Single character identifying the entity:
    ///   'R' Repair, 'I' product-sale Invoice,
    ///   'V' onsite (Van) service, 'K' Cart repair.
    /// </param>
    /// <param name="serviceLocationKey">
    /// FK to <c>tblServiceLocations</c>. The proc reads <c>sTransNumberPrefix</c>
    /// from this row to produce the leading N/S/F character.
    /// </param>
    /// <param name="conn">An open <c>SqlConnection</c>. The caller manages
    /// its lifecycle; we do not open/close it.</param>
    /// <param name="tx">Optional transaction to enroll the EXEC in. When
    /// supplied, the counter increment participates in the outer transaction
    /// — a rollback DOES roll back the increment (the proc is a single
    /// <c>MERGE WITH (HOLDLOCK)</c> with no autonomous-txn markers).
    /// Pass <c>null</c> for autocommit, which leaves the increment in place
    /// even if the caller's subsequent work fails (gaps in the sequence are
    /// tolerated by the business, so autocommit is acceptable for read-only
    /// or fire-and-forget callers).</param>
    Task<string> NextAsync(
        char invoiceType,
        int serviceLocationKey,
        SqlConnection conn,
        SqlTransaction? tx = null,
        CancellationToken ct = default);
}

public class InvoiceNumberService : IInvoiceNumberService
{
    public async Task<string> NextAsync(
        char invoiceType,
        int serviceLocationKey,
        SqlConnection conn,
        SqlTransaction? tx = null,
        CancellationToken ct = default)
    {
        await using var cmd = new SqlCommand("dbo.invoiceNumberDailyGet", conn, tx)
        {
            CommandType = CommandType.StoredProcedure,
        };
        cmd.Parameters.AddWithValue("@psInvoiceType", invoiceType.ToString());
        cmd.Parameters.AddWithValue("@plServiceLocationKey", serviceLocationKey);

        var result = await cmd.ExecuteScalarAsync(ct);
        if (result is null || result == DBNull.Value)
        {
            throw new InvalidOperationException(
                $"invoiceNumberDailyGet returned null for type '{invoiceType}', "
                + $"location {serviceLocationKey}.");
        }
        return (string)result;
    }
}
