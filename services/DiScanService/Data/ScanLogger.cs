using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Data.SqlClient;

namespace DiScanService.Data;

public sealed class ScanLogger(string connectionString) : IScanLogger
{
    public async Task LogAsync(string fileName, ScanResult result, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand("""
            INSERT INTO tblDiScanLog
                (sFileName, sWorkOrderNumber, sStatus, iFailureCount, iItemsLoaded, sErrorMessage, sArchivePath)
            VALUES
                (@file, @wo, @status, @failures, @items, @error, @archive)
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@file",     (object?)fileName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@wo",        (object?)result.WorkOrderNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@status",    result.Status.ToString());
        cmd.Parameters.AddWithValue("@failures",  (object?)result.FailureCount);
        cmd.Parameters.AddWithValue("@items",     (object?)result.ItemsLoaded);
        cmd.Parameters.AddWithValue("@error",     (object?)result.ErrorMessage ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@archive",   (object?)result.ArchivePath ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
