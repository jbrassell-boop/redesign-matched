using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/onsite-services")]
[Authorize]
public class OnsiteServicesController(
    IConfiguration config,
    IInvoiceNumberService invoiceNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Status CASE order matters: Invoiced wins over Submitted when both dates are
        // set, because invoicing is downstream of submission. Previously rows that had
        // been invoiced still showed as 'Submitted' which is misleading. Label 'Void'
        // matches the convention used elsewhere on the stack.
        const string statusExpr = """
            CASE WHEN ss.dtVoidDate IS NOT NULL THEN 'Void'
                 WHEN ss.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
                 WHEN ss.dtDateSubmitted IS NOT NULL THEN 'Submitted'
                 ELSE 'Draft' END
            """;

        // Push search / status / date filters into SQL rather than the C# loop so
        // pagination + totalCount work correctly when real data lands (the legacy
        // in-memory filter was breaking page totals).
        var where = new List<string> { "ss.Deleted_datetime IS NULL" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(ss.sWorkOrderNumber LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search OR t.sTechName LIKE @search)");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all")
            where.Add($"({statusExpr}) = @statusFilter");
        if (!string.IsNullOrWhiteSpace(dateFrom))
            where.Add("ss.dtOnsiteDate >= @dateFrom");
        if (!string.IsNullOrWhiteSpace(dateTo))
            where.Add("ss.dtOnsiteDate < DATEADD(day, 1, @dateTo)");
        var whereClause = "WHERE " + string.Join(" AND ", where);

        var sql = $"""
            SELECT ss.lSiteServiceKey AS lOnsiteServiceKey,
                   ISNULL(ss.sWorkOrderNumber, '') AS sInvoiceNumber,
                   ISNULL(c.sClientName1, '') AS sClientName,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   ss.dtOnsiteDate,
                   ss.dtDateSubmitted AS dtSubmittedDate,
                   {statusExpr} AS sStatus,
                   ISNULL(ss.lTrayCount, 0) AS nTrayCount,
                   ISNULL(ss.lTotalInstruments, 0) AS nInstrumentCount,
                   ISNULL(ss.nInvoiceAmount, 0) AS dblTotalBilled
            FROM tblSiteServices ss
            LEFT JOIN tblClient c ON c.lClientKey = ss.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ss.lDepartmentKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ss.lTechnicianKey
            {whereClause}
            ORDER BY ss.dtOnsiteDate DESC
            """;
        // Get totalCount in SQL too so pagination stays correct.
        var countSql = $"""
            SELECT COUNT(*)
            FROM tblSiteServices ss
            LEFT JOIN tblClient c ON c.lClientKey = ss.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ss.lDepartmentKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ss.lTechnicianKey
            {whereClause}
            """;
        var pagedSql = sql + "\nOFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY";

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        AddListParams(countCmd, search, statusFilter, dateFrom, dateTo);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = new SqlCommand(pagedSql, conn);
        cmd.CommandTimeout = 30;
        AddListParams(cmd, search, statusFilter, dateFrom, dateTo);
        cmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        cmd.Parameters.AddWithValue("@pageSize", pageSize);

        var items = new List<OnsiteServiceListItem>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var visitDate = GetNullableDateTime(reader, "dtOnsiteDate");
            var submittedDate = GetNullableDateTime(reader, "dtSubmittedDate");
            items.Add(new OnsiteServiceListItem(
                OnsiteServiceKey: Convert.ToInt32(reader["lOnsiteServiceKey"]),
                InvoiceNum: reader["sInvoiceNumber"]?.ToString() ?? "",
                ClientName: reader["sClientName"]?.ToString() ?? "",
                DeptName: reader["sDepartmentName"]?.ToString() ?? "",
                TechName: reader["sTechName"]?.ToString() ?? "",
                VisitDate: visitDate?.ToString("MM/dd/yyyy"),
                Status: reader["sStatus"]?.ToString() ?? "Draft",
                TrayCount: reader["nTrayCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nTrayCount"]),
                InstrumentCount: reader["nInstrumentCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nInstrumentCount"]),
                TotalBilled: reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]),
                SubmittedDate: submittedDate?.ToString("MM/dd/yyyy")
            ));
        }

        return Ok(new OnsiteServiceListResponse(items, totalCount));
    }

    private static void AddListParams(SqlCommand cmd, string? search, string? statusFilter, string? dateFrom, string? dateTo)
    {
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all")
            cmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        if (!string.IsNullOrWhiteSpace(dateFrom))
            cmd.Parameters.AddWithValue("@dateFrom", DateTime.Parse(dateFrom));
        if (!string.IsNullOrWhiteSpace(dateTo))
            cmd.Parameters.AddWithValue("@dateTo", DateTime.Parse(dateTo));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT CASE WHEN ss.dtVoidDate IS NOT NULL THEN 'Voided'
                        WHEN ss.dtDateSubmitted IS NOT NULL THEN 'Submitted'
                        WHEN ss.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
                        ELSE 'Draft' END AS sStatus,
                   ISNULL(ss.nInvoiceAmount, 0) AS dblTotalBilled
            FROM tblSiteServices ss
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;

        var total = 0;
        var submitted = 0;
        var invoiced = 0;
        var draft = 0;
        var voidCount = 0;
        var totalValue = 0.0;

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                total++;
                var status = reader["sStatus"]?.ToString() ?? "Draft";
                var amount = reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]);
                totalValue += amount;

                switch (status)
                {
                    case "Submitted": submitted++; break;
                    case "Invoiced": invoiced++; break;
                    case "Draft": draft++; break;
                    case "Void": voidCount++; break;
                }
            }
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }

        return Ok(new OnsiteServiceStats(total, submitted, invoiced, draft, voidCount, totalValue));
    }

    [HttpGet("technicians")]
    public async Task<IActionResult> GetTechnicians()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = "SELECT lTechnicianKey, sTechName FROM tblTechnicians WHERE bIsActive = 1 ORDER BY sTechName";
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        var list = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                technicianKey = Convert.ToInt32(reader["lTechnicianKey"]),
                name = reader["sTechName"]?.ToString() ?? ""
            });
        }
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVisit([FromBody] CreateOnsiteVisitRequest req)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Resolve the dept's service-location key — drives both the
        // sWorkOrderNumber prefix (via the canonical proc) and the
        // lServiceLocationKey column on the new row so list filtering
        // by location lines up post-create.
        int serviceLocationKey;
        await using (var locCmd = new SqlCommand(@"
            SELECT ISNULL(d.lServiceLocationKey, 1) AS lServiceLocationKey
            FROM tblDepartment d
            WHERE d.lDepartmentKey = @deptKey AND d.Deleted_datetime IS NULL", conn))
        {
            locCmd.Parameters.AddWithValue("@deptKey", req.DepartmentKey);
            var locResult = await locCmd.ExecuteScalarAsync();
            if (locResult is null)
                return BadRequest(new { message = $"Department {req.DepartmentKey} not found." });
            serviceLocationKey = Convert.ToInt32(locResult);
        }

        // Generate the next onsite-service WO via the canonical proc.
        // Type 'V' for Van service; produces NV26140001-style numbers.
        // Replaces the legacy "INV-NNNN" format that wrote to the wrong
        // table (tblOnsiteService) — now writes to tblSiteServices to
        // match the cloud deploy.
        var invoiceNum = await invoiceNumbers.NextAsync('V', serviceLocationKey, conn);

        // Location/PriceClass from the legacy request are intentionally not
        // persisted — tblSiteServices doesn't have columns for them. If the
        // wizard needs to surface those fields again, add columns first.
        const string sql = """
            INSERT INTO tblSiteServices
                (sWorkOrderNumber, lClientKey, lDepartmentKey, lTechnicianKey, dtOnsiteDate,
                 sPurchaseOrder, sTruckNumber, sNotes, lServiceLocationKey,
                 Created_datetime, Created_UserKey)
            OUTPUT INSERTED.lSiteServiceKey
            VALUES
                (@invoiceNum, @clientKey, @deptKey, @techKey, @visitDate,
                 @po, @truckNum, @notes, @serviceLocationKey,
                 GETDATE(), @userKey);
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@invoiceNum", invoiceNum);
        cmd.Parameters.AddWithValue("@clientKey", req.ClientKey);
        cmd.Parameters.AddWithValue("@deptKey", req.DepartmentKey);
        cmd.Parameters.AddWithValue("@techKey", req.TechnicianKey);
        cmd.Parameters.AddWithValue("@visitDate", DateTime.Parse(req.VisitDate));
        cmd.Parameters.AddWithValue("@po", (object?)req.Po ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@truckNum", (object?)req.TruckNum ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", (object?)req.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@serviceLocationKey", serviceLocationKey);
        cmd.Parameters.AddWithValue("@userKey", this.GetCurrentUserKey());

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { onsiteServiceKey = newKey, invoiceNum });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOnsiteStatusRequest req)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = "UPDATE tblOnsiteService SET sStatus = @status";
        if (req.Status == "Submitted")
            sql += ", dtSubmittedDate = GETDATE()";
        if (!string.IsNullOrWhiteSpace(req.Notes))
            sql += ", sNotes = @notes";
        sql += " WHERE lOnsiteServiceKey = @id";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@status", req.Status);
        cmd.Parameters.AddWithValue("@id", id);
        if (!string.IsNullOrWhiteSpace(req.Notes))
            cmd.Parameters.AddWithValue("@notes", req.Notes);

        try
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            return Ok(new { updated = rows > 0 });
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ss.lSiteServiceKey, ss.sWorkOrderNumber, ss.dtOnsiteDate,
                   ISNULL(c.sClientName1, '') AS sClientName,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   ISNULL(ss.sPurchaseOrder, '') AS sPurchaseOrder,
                   ISNULL(ss.sTruckNumber, '') AS sTruckNumber,
                   ISNULL(ss.sNotes, '') AS sNotes,
                   ISNULL(ss.lTrayCount, 0) AS lTrayCount,
                   ISNULL(ss.lTotalInstruments, 0) AS lTotalInstruments,
                   ISNULL(ss.nInvoiceAmount, 0) AS nInvoiceAmount,
                   ss.dtInvoiceDate,
                   CASE
                       WHEN ss.dtVoidDate IS NOT NULL THEN 'Void'
                       WHEN ss.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
                       WHEN ss.dtDateSubmitted IS NOT NULL THEN 'Submitted'
                       ELSE 'Draft'
                   END AS sStatus
            FROM tblSiteServices ss
            LEFT JOIN tblClient c ON c.lClientKey = ss.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ss.lDepartmentKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ss.lTechnicianKey
            WHERE ss.lSiteServiceKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Visit not found." });

        var visitDate = reader["dtOnsiteDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtOnsiteDate"]).ToString("MM/dd/yyyy");
        var submittedDate = reader["dtInvoiceDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtInvoiceDate"]).ToString("MM/dd/yyyy");

        return Ok(new OnsiteServiceDetail(
            OnsiteServiceKey: Convert.ToInt32(reader["lSiteServiceKey"]),
            InvoiceNum: reader["sWorkOrderNumber"]?.ToString() ?? "",
            ClientName: reader["sClientName"]?.ToString() ?? "",
            DeptName: reader["sDepartmentName"]?.ToString() ?? "",
            TechName: reader["sTechName"]?.ToString() ?? "",
            VisitDate: visitDate,
            Status: reader["sStatus"]?.ToString() ?? "Draft",
            TrayCount: Convert.ToInt32(reader["lTrayCount"]),
            InstrumentCount: Convert.ToInt32(reader["lTotalInstruments"]),
            TotalBilled: reader["nInvoiceAmount"] == DBNull.Value ? 0 : Convert.ToDouble(reader["nInvoiceAmount"]),
            SubmittedDate: submittedDate,
            PurchaseOrder: reader["sPurchaseOrder"]?.ToString(),
            TruckNumber: reader["sTruckNumber"]?.ToString(),
            Notes: reader["sNotes"]?.ToString()
        ));
    }

    [HttpGet("{id:int}/trays")]
    public async Task<IActionResult> GetTrays(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT t.lSiteServiceTrayKey,
                   ISNULL(t.lTrayNumber, 0) AS lTrayNumber,
                   ISNULL(t.sTrayName, '') AS sTrayName,
                   ISNULL(t.lInstrumentsCount, 0) AS lInstrumentsCount,
                   ISNULL(t.lRepairedCount, 0) AS lRepairedCount,
                   ISNULL(t.lSentToTSICount, 0) AS lSentToTSICount,
                   ISNULL(t.lBeyondEconomicalRepairCount, 0) AS lBeyondEconomicalRepairCount,
                   ISNULL(t.lReplacedCount, 0) AS lReplacedCount
            FROM tblSiteServiceTrays t
            WHERE t.lSiteServiceKey = @id
            ORDER BY t.lTrayNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        var trays = new List<OnsiteServiceTray>();
        while (await reader.ReadAsync())
        {
            trays.Add(new OnsiteServiceTray(
                TrayKey: Convert.ToInt32(reader["lSiteServiceTrayKey"]),
                TrayNumber: Convert.ToInt32(reader["lTrayNumber"]),
                TrayName: reader["sTrayName"]?.ToString() ?? "",
                InstrumentsCount: Convert.ToInt32(reader["lInstrumentsCount"]),
                RepairedCount: Convert.ToInt32(reader["lRepairedCount"]),
                SentToTsiCount: Convert.ToInt32(reader["lSentToTSICount"]),
                BeyondEconomicalRepairCount: Convert.ToInt32(reader["lBeyondEconomicalRepairCount"]),
                ReplacedCount: Convert.ToInt32(reader["lReplacedCount"])
            ));
        }

        return Ok(trays);
    }

    [HttpPatch("{id:int}/submit")]
    public async Task<IActionResult> SubmitForInvoicing(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Try tblSiteServices first, fall back to tblOnsiteService
        try
        {
            await using var cmd = new SqlCommand(
                "UPDATE tblSiteServices SET dtDateSubmitted = GETDATE() WHERE lSiteServiceKey = @id AND dtDateSubmitted IS NULL",
                conn);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@id", id);
            var rows = await cmd.ExecuteNonQueryAsync();
            return Ok(new { submitted = rows > 0 });
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
        }
        catch
        {
            return null;
        }
    }
}
