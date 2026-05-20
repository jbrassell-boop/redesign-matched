using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/receiving")]
[Authorize]
public class ReceivingController(
    IConfiguration config,
    IInvoiceNumberService invoiceNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    /// <summary>
    /// GET /api/receiving/pending — repairs in "Received" status (pending intake queue)
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending([FromQuery] string? search = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = "WHERE rs.sRepairStatus = 'Received'";
        if (!string.IsNullOrWhiteSpace(search))
            where += " AND (c.sClientName1 LIKE @search OR s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR r.sWorkOrderNumber LIKE @search)";

        var sql = $"""
            SELECT r.lRepairKey, ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(r.sComplaintDesc, '') AS sComplaintDesc,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   r.dtDateIn,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {where}
            ORDER BY r.dtDateIn DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");

        await using var reader = await cmd.ExecuteReaderAsync();
        var arrivals = new List<PendingArrival>();
        while (await reader.ReadAsync())
        {
            arrivals.Add(new PendingArrival(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                ScopeTypeDesc: reader["sScopeTypeDesc"]?.ToString() ?? "",
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                ComplaintDesc: reader["sComplaintDesc"]?.ToString() ?? "",
                RepairStatus: reader["sRepairStatus"]?.ToString() ?? "",
                DateIn: reader["dtDateIn"] != DBNull.Value ? Convert.ToDateTime(reader["dtDateIn"]) : null,
                DaysIn: reader["DaysIn"] != DBNull.Value ? Convert.ToInt32(reader["DaysIn"]) : 0
            ));
        }

        return Ok(arrivals);
    }

    /// <summary>
    /// POST /api/receiving/intake — create a new repair from walk-in intake
    /// </summary>
    [HttpPost("intake")]
    public async Task<IActionResult> Intake([FromBody] ReceiveIntakeRequest request)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Get "Received" status ID (read-only lookup, outside the transaction)
        await using var statusCmd = new SqlCommand(
            "SELECT TOP 1 lRepairStatusID FROM tblRepairStatuses WHERE sRepairStatus = 'Received' ORDER BY lRepairStatusSortOrder", conn);
        statusCmd.CommandTimeout = 30;
        var statusObj = await statusCmd.ExecuteScalarAsync();
        var statusId = statusObj != null ? Convert.ToInt32(statusObj) : 1;

        // Look up scope record if serial provided (read-only, outside the transaction)
        int? scopeKey = null;
        if (!string.IsNullOrWhiteSpace(request.SerialNumber))
        {
            await using var scopeCmd = new SqlCommand(
                "SELECT TOP 1 lScopeKey FROM tblScope WHERE sSerialNumber = @serial", conn);
            scopeCmd.CommandTimeout = 30;
            scopeCmd.Parameters.AddWithValue("@serial", request.SerialNumber.Trim());
            var existing = await scopeCmd.ExecuteScalarAsync();
            if (existing != null)
                scopeKey = Convert.ToInt32(existing);
        }

        // Resolve the dept's service-location key so the WO carries the right
        // leading N/S/F character. Falls back to 1 (Upper Chichester / North)
        // if the dept doesn't have one assigned.
        int serviceLocationKey;
        await using (var svcCmd = new SqlCommand(
            "SELECT ISNULL(lServiceLocationKey, 1) FROM tblDepartment WHERE lDepartmentKey = @dk", conn))
        {
            svcCmd.Parameters.AddWithValue("@dk", request.DepartmentKey);
            var svcObj = await svcCmd.ExecuteScalarAsync();
            serviceLocationKey = svcObj is null or DBNull ? 1 : Convert.ToInt32(svcObj);
        }

        await using var transaction = (SqlTransaction)await conn.BeginTransactionAsync();

        try
        {
            // Generate WO via the canonical proc — atomic per-day counter
            // (MERGE-with-HOLDLOCK). Replaces the racy MAX(...)+1 antipattern
            // that produced 7-digit numeric WOs and ignored every NR/SR-
            // prefixed row in the table via the ISNUMERIC=1 filter.
            var woNumber = await invoiceNumbers.NextAsync('R', serviceLocationKey, conn, transaction);

            // Insert repair
            var insertSql = """
                INSERT INTO tblRepair (lDepartmentKey, lScopeKey, lRepairStatusID, sWorkOrderNumber,
                                       sComplaintDesc, dtDateIn)
                VALUES (@deptKey, @scopeKey, @statusId, @woNumber, @complaint, GETDATE());
                SELECT SCOPE_IDENTITY();
                """;

            await using var insertCmd = new SqlCommand(insertSql, conn, transaction);
            insertCmd.CommandTimeout = 30;
            insertCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
            insertCmd.Parameters.AddWithValue("@scopeKey", scopeKey.HasValue ? scopeKey.Value : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@statusId", statusId);
            insertCmd.Parameters.AddWithValue("@woNumber", woNumber);
            insertCmd.Parameters.AddWithValue("@complaint", request.ComplaintDesc ?? "");

            var newKey = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());
            await transaction.CommitAsync();

            return Ok(new ReceiveIntakeResponse(newKey, woNumber));
        }
        catch (SqlException ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/receiving/stats — counts for the receiving dashboard
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                COUNT(*) AS TotalPending,
                SUM(CASE WHEN DATEDIFF(day, r.dtDateIn, GETDATE()) >= 14 THEN 1 ELSE 0 END) AS Overdue,
                SUM(CASE WHEN DATEDIFF(day, r.dtDateIn, GETDATE()) <= 1 THEN 1 ELSE 0 END) AS Today
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE rs.sRepairStatus = 'Received'
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return Ok(new {
                totalPending = reader["TotalPending"] == DBNull.Value ? 0 : Convert.ToInt32(reader["TotalPending"]),
                overdue = reader["Overdue"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Overdue"]),
                today = reader["Today"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Today"])
            });
        }

        return Ok(new { totalPending = 0, overdue = 0, today = 0 });
    }
}
