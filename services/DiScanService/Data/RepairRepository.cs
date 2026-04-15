using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Data.SqlClient;

namespace DiScanService.Data;

public sealed class RepairRepository(string connectionString) : IRepairRepository
{
    public async Task<int?> GetRepairKeyAsync(string woNumber, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(
            "SELECT lRepairKey FROM tblRepair WHERE sWorkOrderNumber = @wo", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@wo", woNumber);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is DBNull or null ? null : Convert.ToInt32(result);
    }

    public async Task<bool> IsAlreadyInDiReviewAsync(int repairKey, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand("""
            SELECT COUNT(1)
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE r.lRepairKey = @key
              AND rs.sRepairStatus = 'Pending D&I Review'
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", repairKey);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
        return count > 0;
    }

    public async Task<IReadOnlyList<DiMappingEntry>> GetMappingsForFailuresAsync(
        IEnumerable<string> failedFields, CancellationToken ct)
    {
        var fields = failedFields.ToList();
        if (fields.Count == 0) return [];

        var paramNames = fields.Select((_, i) => $"@f{i}").ToList();
        var inClause   = string.Join(",", paramNames);

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand($"""
            SELECT sInspectionField, lRepairItemKey, ISNULL(sDescription,'') AS sDescription
            FROM tblDiRepairMapping
            WHERE bActive = 1
              AND sInspectionField IN ({inClause})
            """, conn);
        cmd.CommandTimeout = 30;
        for (int i = 0; i < fields.Count; i++)
            cmd.Parameters.AddWithValue(paramNames[i], fields[i]);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var results = new List<DiMappingEntry>();
        while (await reader.ReadAsync(ct))
            results.Add(new DiMappingEntry(
                reader.GetString(0),
                reader.GetInt32(1),
                reader.GetString(2)));
        return results;
    }

    public async Task LoadLineItemsAsync(
        int repairKey, IEnumerable<DiMappingEntry> items, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);

        foreach (var item in items)
        {
            await using var cmd = new SqlCommand("""
                INSERT INTO tblRepairItemTran
                    (lRepairKey, lRepairItemKey, sApproved, sFixType, dblRepairPrice, dblRepairPriceBase, sComments)
                VALUES
                    (@repairKey, @itemKey, 'P', 'R', 0, 0, @desc)
                """, conn);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@repairKey", repairKey);
            cmd.Parameters.AddWithValue("@itemKey",   item.RepairItemKey);
            cmd.Parameters.AddWithValue("@desc",      (object?)item.Description ?? DBNull.Value);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    public async Task SetDiReviewStatusAsync(int repairKey, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);

        // Get the DI_REVIEW status ID
        await using var idCmd = new SqlCommand(
            "SELECT lRepairStatusID FROM tblRepairStatuses WHERE sRepairStatus = 'Pending D&I Review'",
            conn);
        idCmd.CommandTimeout = 30;
        var statusId = Convert.ToInt32(await idCmd.ExecuteScalarAsync(ct));

        // Update repair + write status log (mirrors existing pattern in RepairsController)
        await using var updateCmd = new SqlCommand("""
            UPDATE tblRepair SET lRepairStatusID = @statusId WHERE lRepairKey = @key;
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate)
            SELECT @key, @statusId, sRepairStatus, GETDATE()
            FROM tblRepairStatuses WHERE lRepairStatusID = @statusId;
            """, conn);
        updateCmd.CommandTimeout = 30;
        updateCmd.Parameters.AddWithValue("@statusId", statusId);
        updateCmd.Parameters.AddWithValue("@key",      repairKey);
        await updateCmd.ExecuteNonQueryAsync(ct);
    }
}
