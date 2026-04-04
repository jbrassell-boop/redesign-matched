using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/loaners")]
[Authorize]
public class LoanersController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (st.sScopeTypeDesc LIKE @search
                 OR s.sSerialNumber LIKE @search
                 OR c.sClientName1 LIKE @search
                 OR d.sDepartmentName LIKE @search
                 OR lt.sTrackingNumber LIKE @search
                 OR lt.sPurchaseOrder LIKE @search
                 OR r.sWorkOrderNumber LIKE @search)
                """);

        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "All")
        {
            if (statusFilter == "Overdue")
                where.Add("lt.sDateIn IS NULL AND lt.sDateOut IS NOT NULL AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 30");
            else if (statusFilter == "Out")
                where.Add("lt.sDateIn IS NULL AND lt.sDateOut IS NOT NULL");
            else if (statusFilter == "Returned")
                where.Add("lt.sDateIn IS NOT NULL");
            else if (statusFilter == "Declined")
                where.Add("lt.sRepairClosed = 'D'");
        }

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblLoanerTran lt
            LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT lt.lLoanerTranKey, lt.lScopeKey, lt.lRepairKey, lt.lDepartmentKey,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   lt.sDateOut, lt.sDateIn,
                   ISNULL(lt.sTrackingNumber, '') AS sTrackingNumber,
                   ISNULL(lt.sPurchaseOrder, '') AS sPurchaseOrder,
                   lt.sRepairClosed,
                   ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   CASE
                       WHEN lt.sRepairClosed = 'D' THEN 'Declined'
                       WHEN lt.sDateIn IS NOT NULL THEN 'Returned'
                       WHEN lt.sDateOut IS NOT NULL AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 30 THEN 'Overdue'
                       WHEN lt.sDateOut IS NOT NULL THEN 'Out'
                       ELSE 'Pending'
                   END AS sStatus,
                   CASE
                       WHEN lt.sDateOut IS NOT NULL THEN
                           DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime),
                               CASE WHEN lt.sDateIn IS NOT NULL THEN TRY_CAST(lt.sDateIn AS datetime) ELSE GETDATE() END)
                       ELSE 0
                   END AS DaysOut
            FROM tblLoanerTran lt
            LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
            {whereClause}
            ORDER BY lt.lLoanerTranKey DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<LoanerListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new LoanerListItem(
                LoanerTranKey: Convert.ToInt32(reader["lLoanerTranKey"]),
                ScopeKey: reader["lScopeKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lScopeKey"]),
                RepairKey: reader["lRepairKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lRepairKey"]),
                DepartmentKey: reader["lDepartmentKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lDepartmentKey"]),
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                Dept: reader["sDepartmentName"]?.ToString() ?? "",
                DateOut: reader["sDateOut"]?.ToString() ?? "",
                DateIn: reader["sDateIn"]?.ToString() ?? "",
                TrackingNumber: reader["sTrackingNumber"]?.ToString() ?? "",
                PurchaseOrder: reader["sPurchaseOrder"]?.ToString() ?? "",
                Status: reader["sStatus"]?.ToString() ?? "",
                DaysOut: reader["DaysOut"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysOut"]),
                WorkOrder: reader["sWorkOrderNumber"]?.ToString() ?? ""
            ));
        }

        return Ok(new LoanerListResponse(items, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT lt.lLoanerTranKey, lt.lScopeKey, lt.lRepairKey, lt.lDepartmentKey,
                   lt.lSalesRepKey, lt.lDeliveryMethodKey, lt.lContractKey,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(s.sLoanerRackPosition, '') AS sLoanerRackPosition,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   lt.sDateOut, lt.sDateIn,
                   ISNULL(lt.sTrackingNumber, '') AS sTrackingNumber,
                   ISNULL(lt.sPurchaseOrder, '') AS sPurchaseOrder,
                   lt.sRepairClosed, lt.dtCreateDate,
                   ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   ISNULL(sr.sSalesRepName, '') AS sSalesRepName,
                   ISNULL(dm.sDeliveryMethodDesc, '') AS sDeliveryMethodDesc,
                   CASE
                       WHEN lt.sRepairClosed = 'D' THEN 'Declined'
                       WHEN lt.sDateIn IS NOT NULL THEN 'Returned'
                       WHEN lt.sDateOut IS NOT NULL AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 30 THEN 'Overdue'
                       WHEN lt.sDateOut IS NOT NULL THEN 'Out'
                       ELSE 'Pending'
                   END AS sStatus,
                   CASE
                       WHEN lt.sDateOut IS NOT NULL THEN
                           DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime),
                               CASE WHEN lt.sDateIn IS NOT NULL THEN TRY_CAST(lt.sDateIn AS datetime) ELSE GETDATE() END)
                       ELSE 0
                   END AS DaysOut
            FROM tblLoanerTran lt
            LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = lt.lSalesRepKey
            LEFT JOIN tblDeliveryMethod dm ON dm.lDeliveryMethodKey = lt.lDeliveryMethodKey
            WHERE lt.lLoanerTranKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound();

        var detail = new LoanerDetail(
            LoanerTranKey: Convert.ToInt32(reader["lLoanerTranKey"]),
            ScopeKey: reader["lScopeKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lScopeKey"]),
            RepairKey: reader["lRepairKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lRepairKey"]),
            DepartmentKey: reader["lDepartmentKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lDepartmentKey"]),
            SalesRepKey: reader["lSalesRepKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lSalesRepKey"]),
            DeliveryMethodKey: reader["lDeliveryMethodKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lDeliveryMethodKey"]),
            ContractKey: reader["lContractKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lContractKey"]),
            ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
            Serial: reader["sSerialNumber"]?.ToString() ?? "",
            Client: reader["sClientName1"]?.ToString() ?? "",
            Dept: reader["sDepartmentName"]?.ToString() ?? "",
            DateOut: reader["sDateOut"]?.ToString() ?? "",
            DateIn: reader["sDateIn"]?.ToString() ?? "",
            TrackingNumber: reader["sTrackingNumber"]?.ToString() ?? "",
            PurchaseOrder: reader["sPurchaseOrder"]?.ToString() ?? "",
            Status: reader["sStatus"]?.ToString() ?? "",
            DaysOut: reader["DaysOut"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysOut"]),
            WorkOrder: reader["sWorkOrderNumber"]?.ToString() ?? "",
            SalesRep: reader["sSalesRepName"]?.ToString() ?? "",
            DeliveryMethod: reader["sDeliveryMethodDesc"]?.ToString() ?? "",
            RackPosition: reader["sLoanerRackPosition"]?.ToString() ?? "",
            RepairClosed: reader["sRepairClosed"]?.ToString() ?? "",
            CreatedDate: reader["dtCreateDate"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtCreateDate"]).ToString("MM/dd/yyyy")
        );

        return Ok(detail);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN lt.sDateIn IS NULL AND lt.sDateOut IS NOT NULL AND lt.sRepairClosed IS NULL
                         AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) <= 30 THEN 1 ELSE 0 END) AS OutCount,
                SUM(CASE WHEN lt.sDateIn IS NULL AND lt.sDateOut IS NOT NULL AND lt.sRepairClosed IS NULL
                         AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 30 THEN 1 ELSE 0 END) AS OverdueCount,
                SUM(CASE WHEN lt.sDateIn IS NOT NULL THEN 1 ELSE 0 END) AS ReturnedCount,
                SUM(CASE WHEN lt.sRepairClosed = 'D' THEN 1 ELSE 0 END) AS DeclinedCount
            FROM tblLoanerTran lt
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var total = Convert.ToInt32(reader["Total"]);
        var outCount = Convert.ToInt32(reader["OutCount"]);
        var overdue = Convert.ToInt32(reader["OverdueCount"]);
        var returned = Convert.ToInt32(reader["ReturnedCount"]);
        var declined = Convert.ToInt32(reader["DeclinedCount"]);
        var fulfilled = outCount + overdue + returned;
        var fillRate = total > 0 ? (int)Math.Round(100.0 * fulfilled / total) : 0;

        return Ok(new LoanerStats(total, outCount, overdue, returned, declined, fillRate));
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "r.bLoanerRequested = 1" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR s.sSerialNumber LIKE @search OR c.sClientName1 LIKE @search)");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "All")
        {
            if (statusFilter == "Fulfilled")
                where.Add("r.sWasLoanerProduced = 'Yes'");
            else if (statusFilter == "Pending")
                where.Add("(r.sWasLoanerProduced IS NULL OR r.sWasLoanerProduced = '')");
            else if (statusFilter == "Declined")
                where.Add("r.sWasLoanerProduced = 'No'");
        }

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var sql = $"""
            SELECT TOP 200
                r.lRepairKey,
                ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                r.dtDateIn,
                ISNULL(r.sWasLoanerProduced, '') AS sWasLoanerProduced,
                CASE
                    WHEN r.sWasLoanerProduced = 'Yes' THEN 'Fulfilled'
                    WHEN r.sWasLoanerProduced = 'No' THEN 'Declined'
                    ELSE 'Pending'
                END AS sRequestStatus
            FROM tblRepair r
            LEFT JOIN tblScope s ON r.lScopeKey = s.lScopeKey
            LEFT JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
            LEFT JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY r.dtDateIn DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        if (!string.IsNullOrWhiteSpace(search)) cmd.Parameters.AddWithValue("@search", $"%{search}%");
        await using var reader = await cmd.ExecuteReaderAsync();

        var requests = new List<LoanerRequest>();
        while (await reader.ReadAsync())
        {
            requests.Add(new LoanerRequest(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrder: reader["sWorkOrderNumber"]?.ToString() ?? "",
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                Department: reader["sDepartmentName"]?.ToString() ?? "",
                DateRequested: reader["dtDateIn"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateIn"]),
                LoanerProduced: reader["sWasLoanerProduced"]?.ToString() ?? "",
                Status: reader["sRequestStatus"]?.ToString() ?? ""
            ));
        }

        return Ok(requests);
    }

    [HttpPatch("requests/{repairKey:int}/fulfill")]
    public async Task<IActionResult> FulfillRequest(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET sWasLoanerProduced = 'Yes' WHERE lRepairKey = @id AND bLoanerRequested = 1", conn);
        cmd.Parameters.AddWithValue("@id", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? Ok() : NotFound();
    }

    [HttpPatch("requests/{repairKey:int}/decline")]
    public async Task<IActionResult> DeclineRequest(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET sWasLoanerProduced = 'No' WHERE lRepairKey = @id AND bLoanerRequested = 1", conn);
        cmd.Parameters.AddWithValue("@id", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? Ok() : NotFound();
    }

    [HttpPost("requests/bulk")]
    public async Task<IActionResult> BulkUpdateRequests([FromBody] BulkLoanerRequestAction body)
    {
        if (body.RepairKeys.Count == 0)
            return BadRequest("No repair keys provided");
        if (body.Action != "fulfill" && body.Action != "decline")
            return BadRequest("Action must be 'fulfill' or 'decline'");

        var value = body.Action == "fulfill" ? "Yes" : "No";

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var paramList = new List<string>();
        await using var cmd = new SqlCommand();
        cmd.Connection = conn;
        for (var i = 0; i < body.RepairKeys.Count; i++)
        {
            paramList.Add($"@k{i}");
            cmd.Parameters.AddWithValue($"@k{i}", body.RepairKeys[i]);
        }
        cmd.Parameters.AddWithValue("@val", value);
        cmd.CommandText = $"UPDATE tblRepair SET sWasLoanerProduced = @val WHERE bLoanerRequested = 1 AND lRepairKey IN ({string.Join(",", paramList)})";

        var rows = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rows });
    }

    // ── Scope Needs ───────────────────────────────────────────────────────────

    [HttpGet("scope-needs")]
    public async Task<IActionResult> GetScopeNeeds()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Repairs currently in progress grouped by scope type + department
        // Avg TAT = avg DATEDIFF(day, dtDateIn, GETDATE()) for open repairs
        const string sql = """
            SELECT
                ISNULL(st.sScopeTypeDesc, 'Unknown') AS sScopeTypeDesc,
                ISNULL(d.sDepartmentName, 'Unknown') AS sDepartmentName,
                ISNULL(c.sClientName1, '') AS sClientName1,
                COUNT(*) AS RepairsInProgress,
                AVG(DATEDIFF(day, r.dtDateIn, GETDATE())) AS AvgTat
            FROM tblRepair r
            INNER JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            INNER JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE r.dtDateOut IS NULL
              AND r.dtDateIn IS NOT NULL
              AND r.bLoanerRequested = 1
            GROUP BY st.sScopeTypeDesc, d.sDepartmentName, c.sClientName1
            ORDER BY RepairsInProgress DESC, sScopeTypeDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<LoanerScopeNeedItem>();
        while (await reader.ReadAsync())
        {
            var avgTat = reader["AvgTat"] == DBNull.Value ? 0.0 : Convert.ToDouble(reader["AvgTat"]);
            // Estimated need date: today + avgTat days (when repair would complete and loaner return)
            var estimatedNeed = DateTime.Today.AddDays(avgTat).ToString("MM/dd/yyyy");

            items.Add(new LoanerScopeNeedItem(
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                DeptName: reader["sDepartmentName"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                RepairsInProgress: Convert.ToInt32(reader["RepairsInProgress"]),
                AvgTat: Math.Round(avgTat, 1),
                EstimatedNeedDate: estimatedNeed
            ));
        }

        return Ok(items);
    }
}
