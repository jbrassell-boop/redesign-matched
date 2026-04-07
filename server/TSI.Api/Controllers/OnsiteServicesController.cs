using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/onsite-services")]
[Authorize]
public class OnsiteServicesController(IConfiguration config) : ControllerBase
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

        // Call stored procedure to get onsite services
        await using var cmd = new SqlCommand("onsiteServicesGet", conn);
        cmd.CommandTimeout = 30;
        cmd.CommandType = System.Data.CommandType.StoredProcedure;

        var items = new List<OnsiteServiceListItem>();
        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var visitDate = GetNullableDateTime(reader, "dtOnsiteDate");
                var submittedDate = GetNullableDateTime(reader, "dtSubmittedDate");
                var status = reader["sStatus"]?.ToString() ?? "Draft";

                // Apply filters in-memory since stored proc doesn't support them
                if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all" &&
                    !string.Equals(status, statusFilter, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!string.IsNullOrWhiteSpace(dateFrom) && visitDate.HasValue &&
                    visitDate.Value < DateTime.Parse(dateFrom))
                    continue;

                if (!string.IsNullOrWhiteSpace(dateTo) && visitDate.HasValue &&
                    visitDate.Value > DateTime.Parse(dateTo).AddDays(1))
                    continue;

                var invoiceNum = reader["sInvoiceNumber"]?.ToString() ?? "";
                var clientName = reader["sClientName"]?.ToString() ?? "";
                var deptName = reader["sDepartmentName"]?.ToString() ?? "";
                var techName = reader["sTechName"]?.ToString() ?? "";

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var hay = $"{invoiceNum}{clientName}{deptName}{techName}".ToLower();
                    if (!hay.Contains(search.ToLower()))
                        continue;
                }

                items.Add(new OnsiteServiceListItem(
                    OnsiteServiceKey: Convert.ToInt32(reader["lOnsiteServiceKey"]),
                    InvoiceNum: invoiceNum,
                    ClientName: clientName,
                    DeptName: deptName,
                    TechName: techName,
                    VisitDate: visitDate?.ToString("MM/dd/yyyy"),
                    Status: status,
                    TrayCount: reader["nTrayCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nTrayCount"]),
                    InstrumentCount: reader["nInstrumentCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nInstrumentCount"]),
                    TotalBilled: reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]),
                    SubmittedDate: submittedDate?.ToString("MM/dd/yyyy")
                ));
            }
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }

        var totalCount = items.Count;
        var paged = items
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new OnsiteServiceListResponse(paged, totalCount));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("onsiteServicesGet", conn);
        cmd.CommandTimeout = 30;
        cmd.CommandType = System.Data.CommandType.StoredProcedure;

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

        // Generate next invoice number
        await using var seqCmd = new SqlCommand(
            "SELECT ISNULL(MAX(CAST(REPLACE(sInvoiceNumber, 'INV-', '') AS INT)), 4000) + 1 FROM tblOnsiteService WHERE sInvoiceNumber LIKE 'INV-%'",
            conn);
        seqCmd.CommandTimeout = 30;

        int nextNum;
        try
        {
            nextNum = Convert.ToInt32(await seqCmd.ExecuteScalarAsync());
        }
        catch
        {
            nextNum = new Random().Next(5000, 9999);
        }

        var invoiceNum = $"INV-{nextNum}";

        const string sql = """
            INSERT INTO tblOnsiteService
                (sInvoiceNumber, lClientKey, lDepartmentKey, lTechnicianKey, dtOnsiteDate,
                 sLocation, sPONumber, sTruckNum, sPriceClass, sNotes, sStatus, dtCreated)
            VALUES
                (@invoiceNum, @clientKey, @deptKey, @techKey, @visitDate,
                 @location, @po, @truckNum, @priceClass, @notes, 'Draft', GETDATE());
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@invoiceNum", invoiceNum);
        cmd.Parameters.AddWithValue("@clientKey", req.ClientKey);
        cmd.Parameters.AddWithValue("@deptKey", req.DepartmentKey);
        cmd.Parameters.AddWithValue("@techKey", req.TechnicianKey);
        cmd.Parameters.AddWithValue("@visitDate", DateTime.Parse(req.VisitDate));
        cmd.Parameters.AddWithValue("@location", (object?)req.Location ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@po", (object?)req.Po ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@truckNum", (object?)req.TruckNum ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@priceClass", (object?)req.PriceClass ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", (object?)req.Notes ?? DBNull.Value);

        try
        {
            var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            return Ok(new { onsiteServiceKey = newKey, invoiceNum });
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
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
