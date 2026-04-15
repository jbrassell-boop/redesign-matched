using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/di-review")]
[Authorize]
public class DiReviewController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // GET /api/di-review
    // Returns all WOs in 'Pending D&I Review' status
    [HttpGet]
    public async Task<IActionResult> GetQueue()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            SELECT r.lRepairKey,
                   r.sWorkOrderNumber,
                   ISNULL(c.sClientName,'') AS sClientName,
                   ISNULL(st.sScopeTypeDesc,'') AS sScopeType,
                   ISNULL(s.sSerialNumber,'') AS sSerialNumber,
                   ISNULL(l.dtScanned, r.dtDateIn) AS dtScanned,
                   ISNULL(l.iFailureCount, 0) AS iFailureCount,
                   ISNULL(l.iItemsLoaded, 0) AS iItemsLoaded,
                   ISNULL(l.sStatus,'') AS sScanStatus
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN (
                SELECT sWorkOrderNumber, MAX(dtScanned) AS dtScanned,
                       MAX(iFailureCount) AS iFailureCount, MAX(iItemsLoaded) AS iItemsLoaded,
                       MAX(sStatus) AS sStatus
                FROM tblDiScanLog GROUP BY sWorkOrderNumber
            ) l ON l.sWorkOrderNumber = r.sWorkOrderNumber
            WHERE rs.sRepairStatus = 'Pending D&I Review'
            ORDER BY ISNULL(l.dtScanned, r.dtDateIn) ASC
            """, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
            items.Add(new {
                repairKey    = reader.GetInt32(0),
                woNumber     = reader.GetString(1),
                client       = reader.GetString(2),
                scopeType    = reader.GetString(3),
                serialNumber = reader.GetString(4),
                scannedAt    = reader.GetDateTime(5),
                failureCount = reader.GetInt32(6),
                itemsLoaded  = reader.GetInt32(7),
                scanStatus   = reader.GetString(8)
            });
        return Ok(items);
    }

    // GET /api/di-review/{repairKey}
    [HttpGet("{repairKey:int}")]
    public async Task<IActionResult> GetDetail(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            SELECT rit.lRepairItemTranKey,
                   ISNULL(ri.sRepairItemDesc,'') AS sDescription,
                   ISNULL(rit.sComments,'') AS sFinding,
                   rit.sApproved
            FROM tblRepairItemTran rit
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            WHERE rit.lRepairKey = @key
            ORDER BY rit.lRepairItemTranKey
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
            items.Add(new {
                tranKey     = reader.GetInt32(0),
                description = reader.GetString(1),
                finding     = reader.GetString(2),
                approved    = reader.GetString(3)
            });
        return Ok(items);
    }

    // DELETE /api/di-review/{repairKey}/items/{tranKey}
    [HttpDelete("{repairKey:int}/items/{tranKey:int}")]
    public async Task<IActionResult> RemoveItem(int repairKey, int tranKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey",
            conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@tranKey",   tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    // POST /api/di-review/{repairKey}/approve
    [HttpPost("{repairKey:int}/approve")]
    public async Task<IActionResult> Approve(int repairKey, [FromBody] ApproveBody body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        if (!string.IsNullOrWhiteSpace(body.TechComments))
        {
            await using var notesCmd = new SqlCommand(
                "UPDATE tblRepair SET mCommentsDisIns = @notes WHERE lRepairKey = @key", conn);
            notesCmd.CommandTimeout = 30;
            notesCmd.Parameters.AddWithValue("@notes", body.TechComments);
            notesCmd.Parameters.AddWithValue("@key",   repairKey);
            await notesCmd.ExecuteNonQueryAsync();
        }

        await using var statusCmd = new SqlCommand("""
            DECLARE @nextStatusId INT = (
                SELECT TOP 1 lRepairStatusID
                FROM tblRepairStatuses
                WHERE sRepairStatus <> 'Pending D&I Review'
                  AND ISNULL(bIsReadOnly,0) = 0
                ORDER BY lRepairStatusSortOrder
            );
            UPDATE tblRepair SET lRepairStatusID = @nextStatusId WHERE lRepairKey = @key;
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate)
            SELECT @key, @nextStatusId, sRepairStatus, GETDATE()
            FROM tblRepairStatuses WHERE lRepairStatusID = @nextStatusId;
            """, conn);
        statusCmd.CommandTimeout = 30;
        statusCmd.Parameters.AddWithValue("@key", repairKey);
        await statusCmd.ExecuteNonQueryAsync();

        return NoContent();
    }

    // POST /api/di-review/{repairKey}/hold
    [HttpPost("{repairKey:int}/hold")]
    public async Task<IActionResult> Hold(int repairKey, [FromBody] HoldBody body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("""
            UPDATE tblRepair
            SET mCommentsDisIns = ISNULL(mCommentsDisIns,'') + CHAR(13)+CHAR(10)
                + '[HOLD ' + CONVERT(VARCHAR,GETDATE(),120) + '] ' + @note
            WHERE lRepairKey = @key
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@note", body.Note ?? string.Empty);
        cmd.Parameters.AddWithValue("@key",  repairKey);
        await cmd.ExecuteNonQueryAsync();

        return NoContent();
    }

    public record ApproveBody(string? TechComments);
    public record HoldBody(string? Note);
}
